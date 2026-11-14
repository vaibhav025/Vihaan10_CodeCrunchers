"""Language-model gateway: a fallback chain of OpenAI-compatible providers.

Prune, Gemini, Groq and a local Ollama server all speak the OpenAI chat API, so one
client covers every option. When Prune is configured it is tried first, and in strict
mode it is the only route: a request Prune blocks is never sent around it. A provider
that fails or hits its quota is rested for a minute and the next one is tried; with
none available the caller answers locally.
"""
import asyncio
import json
import logging
import time
from pathlib import Path

from openai import APIStatusError, AsyncOpenAI

from app.config import settings

_KB_PATH = Path(__file__).resolve().parents[1] / "ml" / "nps_knowledge_base.json"
try:
    KNOWLEDGE = json.loads(_KB_PATH.read_text())
except (OSError, json.JSONDecodeError):
    KNOWLEDGE = {}

_clients: dict[str, AsyncOpenAI] = {}
_resting: dict[str, float] = {}
COOLDOWN_SECONDS = 60
logger = logging.getLogger("pensionquest.ai")


def retrieve_knowledge(query: str, limit: int = 3) -> list[str]:
    terms = set(query.lower().split())
    items = []
    def walk(value, path=""):
        if isinstance(value, dict):
            for k, v in value.items(): walk(v, f"{path} {k}")
        elif isinstance(value, list):
            for v in value: walk(v, path)
        else:
            text = f"{path}: {value}"
            score = sum(1 for term in terms if len(term) > 2 and term in text.lower())
            if score: items.append((score, text))
    walk(KNOWLEDGE)
    return [text for _, text in sorted(items, key=lambda x: x[0], reverse=True)[:limit]]


def local_answer(query: str, language: str = "en") -> str:
    facts = retrieve_knowledge(query)
    if not facts:
        return "I can answer general NPS questions from the offline guide. Try asking about eligibility, contributions, tax deductions, or withdrawals."
    prefix = {"hi": "ऑफ़लाइन NPS मार्गदर्शिका के अनुसार:", "ta": "ஆஃப்லைன் NPS வழிகாட்டியின்படி:",
              "te": "ఆఫ్‌లైన్ NPS మార్గదర్శకం ప్రకారం:", "bn": "অফলাইন NPS নির্দেশিকা অনুযায়ী:",
              "mr": "ऑफलाइन NPS मार्गदर्शकानुसार:"}.get(language, "From the offline NPS guide:")
    return prefix + " " + " ".join(facts) + " This is general information, not financial advice."


def providers() -> list[tuple[str, str | None, str, str]]:
    """Configured providers as (name, base_url, api_key, model), preferred one first.

    Prune, when configured, always comes first. In strict mode it is the only route out.
    """
    if settings.PRUNE_API_KEY:
        prune = [("prune", settings.PRUNE_BASE_URL, settings.PRUNE_API_KEY, settings.PRUNE_MODEL)]
        if settings.PRUNE_STRICT:
            return prune
    else:
        prune = []
    found = []
    if settings.GEMINI_API_KEY:
        found.append(("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/", settings.GEMINI_API_KEY, settings.GEMINI_MODEL))
    if settings.GROQ_API_KEY:
        found.append(("groq", "https://api.groq.com/openai/v1", settings.GROQ_API_KEY, settings.GROQ_MODEL))
    if settings.OPENAI_API_KEY:
        found.append(("openai", None, settings.OPENAI_API_KEY, settings.OPENAI_MODEL))
    if settings.OLLAMA_URL:
        found.append(("ollama", settings.OLLAMA_URL.rstrip("/") + "/v1", "ollama", settings.OLLAMA_MODEL))
    return prune + sorted(found, key=lambda p: p[0] != settings.AI_PROVIDER)


def prune_headers() -> dict[str, str]:
    """Per-request Prune settings. No user identifier is sent."""
    return {
        "X-Prune-Key": settings.PRUNE_API_KEY,   # the docs show both this and a Bearer token; we send both
        "X-Prune-Injection": "block",            # refuse prompt-injection attempts
        "X-Prune-Feature-Id": "coach-chat",      # groups spend in the Prune dashboard
        "X-Prune-Workload": "chat",
        "X-Prune-Cache": settings.PRUNE_CACHE,
    }


def _client(name: str, base_url: str | None, key: str) -> AsyncOpenAI:
    client = _clients.get(name)
    if client is None:
        extra = prune_headers() if name == "prune" else None
        client = _clients[name] = AsyncOpenAI(api_key=key, base_url=base_url, timeout=15.0, max_retries=0,
                                              default_headers=extra)
    return client


def _prune_receipt(response) -> dict:
    """Summarise prune_metadata without its raw contents. Field names vary across Prune's docs."""
    try:
        meta = response.model_dump().get("prune_metadata") or {}
    except Exception:
        meta = {}
    if not isinstance(meta, dict):
        return {}
    return {
        "cache_hit": bool(meta.get("cache_hit")),
        "signed": bool(meta.get("receipt_signature")),
        "pii_shield": meta.get("pii_shield"),
        "routed_model": meta.get("routed_model"),
    }


async def complete(system_prompt: str, messages: list[dict], max_tokens: int = 500,
                   temperature: float = 0.4, info: dict | None = None) -> tuple[str | None, str | None]:
    """Return (reply, provider name), or (None, None) when no provider could answer.

    `info`, if given, is filled with what happened at the gateway: which route was used,
    whether Prune blocked the request (and why), and a summary of Prune's receipt.
    """
    info = info if info is not None else {}
    for name, base_url, key, model in providers():
        if _resting.get(name, 0) > time.monotonic():
            continue
        try:
            response = await asyncio.wait_for(_client(name, base_url, key).chat.completions.create(
                model=model, max_tokens=max_tokens, temperature=temperature,
                messages=[{"role": "system", "content": system_prompt}, *messages],
            ), timeout=18)
            text = (response.choices[0].message.content or "").strip()
            if text:
                info["gateway"] = name
                if name == "prune":
                    info["receipt"] = _prune_receipt(response)
                return text, name
        except APIStatusError as exc:
            code = exc.response.headers.get("X-Prune-Shield-Code") if name == "prune" else None
            if code:
                # Prune refused the request on purpose. Never retry it around the gateway.
                logger.info("Prune Shield blocked a request: %s", code)
                info.update(gateway="prune", blocked=code)
                if code == "spend_cap":
                    _resting[name] = time.monotonic() + COOLDOWN_SECONDS
                return None, None
            logger.warning("AI provider %s returned HTTP %s", name, exc.status_code)
        except Exception as exc:
            logger.warning("AI provider %s failed: %s", name, type(exc).__name__)
        _resting[name] = time.monotonic() + COOLDOWN_SECONDS
    return None, None


async def get_ai_response(system_prompt: str, messages: list[dict], max_tokens: int = 500,
                          temperature: float = 0.4, language: str = "en") -> str:
    text, _ = await complete(system_prompt, messages, max_tokens, temperature)
    return text or local_answer(messages[-1]["content"] if messages else "", language)
