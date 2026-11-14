# PensionQuest backend

## Local setup (no paid services required)

The API uses SQLite by default and creates `pensionquest.db` on first startup. The browser receives an HttpOnly, SameSite session cookie; passwords are hashed, and profile fields, tracker snapshots, and NPS contribution amounts are encrypted with AES-GCM before database writes. Email lookup uses a keyed HMAC index. No financial tracker values or auth token are kept in browser local storage. Registration and the API fail closed until the two secrets below are configured.

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c 'import secrets; print(secrets.token_hex(32))'
python -c 'import secrets,base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())'
# Put the first output in JWT_SECRET and the second in DATA_ENCRYPTION_KEY in .env.
uvicorn app.main:app --reload --port 8000
```

The API is at `http://localhost:8000`; interactive endpoint docs are at `/docs`. The Vite frontend proxies `/api` to this local API. Back up both `pensionquest.db` and the encryption key. If the key is lost or changed without re-encrypting the records, encrypted tracker data cannot be recovered. Keep `.env` and database backups out of source control.

For production, set `APP_ENV=production`, serve the API only over HTTPS, use a persistent managed PostgreSQL database, and store both secrets in the hosting provider's secret manager. The project also uses Redis for leaderboard caching and an optional OpenAI or Gemini key for AI Coach responses; neither is required for account or tracker storage.

The backend creates missing tables on startup and upgrades older local schemas, encrypting legacy profile, tracker, and contribution values before serving requests. Use versioned Alembic migrations before production deployment.

This is application-level encryption for a hackathon app, not a compliance certification or a claim that the project is ready for regulated or truly classified records. Keep demo data synthetic. A free hosted database can have important limits: Supabase's current Free plan pauses inactive projects, has no automatic backups, and does not include SOC 2/HIPAA features. See [current plan details](https://supabase.com/pricing).

## Local full stack

From the repository root, create a `.env` containing a random `JWT_SECRET` (at least 32 characters), a URL-safe base64 32-byte `DATA_ENCRYPTION_KEY`, and optionally one AI key. Then run `docker compose up --build`. Compose runs the Alembic migration before the API. For local direct runs, run `alembic -c alembic.ini upgrade head` from `backend/` first. The API readiness endpoint is `/health/ready`; it reports 503 until both Postgres and Redis respond. Do not use the compose Postgres password outside local development.

For an existing pre-encryption database, stop the API, set the original `DATA_ENCRYPTION_KEY`, and run `python -m scripts.migrate_legacy_encryption` from `backend/` once before restarting. The startup hook no longer scans and re-encrypts every user's data on every boot.

Users must accept account-data processing during registration. AI provider use is opt-in in Profile settings; the provider receives only the current question, the recent chat transcript, and matching NPS guide excerpts. Account export and deletion are available at `GET /api/user/export` and `DELETE /api/user/me`. Leaderboard participation is off by default and uses a user-selected public handle.

For a ciphertext demo, create a synthetic account and run `python -m scripts.show_data_vault --user-id <uuid>` from `backend/`. It prints the stored ciphertext next to the decrypted ORM/API view; do not run it against a real user's account during a public demo.

Ciphertext envelopes carry a key identifier (`enc:v1:<kid>:...`) to make rotation possible. The current application reads the configured primary key only; production rotation should retain old keys for decryption during re-encryption, then move the key material to a managed KMS/HSM. Back up the current key separately: losing it makes encrypted records unreadable.

## The all-in-one assistant (`POST /api/ai/coach/chat`)

One chat handles the user's own numbers ("What is my net worth?"), what-if sums ("What if I invest 5000 a month?"), personal suggestions, retirement readiness, progress, and general finance or NPS questions. The code is in `app/services/assistant.py`.

How privacy is kept:

- Every figure is computed on this server from the decrypted tracker. Replies carry a `provider` field; `private` means no outside model was involved.
- An outside model is used only if the user has turned on AI consent. Even then it receives placeholders such as `{{NET_WORTH}}` and coarse status notes, never values. The server fills the real figures in afterwards.
- Emails, phone numbers, PAN/Aadhaar-like IDs and rupee amounts typed by the user are masked before any text is sent out.
- A model reply that drops the placeholders (and so could contain invented figures) is discarded in favour of the server's own answer.

It costs nothing to run. With no key set, the built-in engine answers everything. To add natural wording, set any of `GEMINI_API_KEY`, `GROQ_API_KEY` or `OLLAMA_URL` (a local model, so nothing leaves the machine) in `.env`. All configured providers form a fallback chain, and one that fails or hits its quota is rested for a minute. Model names are set in `app/config.py`; check them against the provider's current list.

## Prune AI gateway (optional)

When `PRUNE_API_KEY` is set, every AI request from the chat goes through [Prune](https://www.withprune.com) instead of straight to the provider. The order is:

1. Our server swaps the user's figures for placeholders and masks typed amounts and IDs (as above).
2. Prune screens the request: it blocks prompt-injection attempts (`X-Prune-Injection: block`), applies the spend caps and data filters set in the Prune dashboard, can serve repeated questions from its cache, and returns a signed receipt.
3. Prune forwards it to the provider whose key is saved in the Prune dashboard (for example Gemini).

If Prune refuses a request, the refusal is final: it is never retried directly with a provider, and the built-in engine answers instead. With `PRUNE_STRICT=true` (the default) Prune is the only route out; if it is down, the built-in engine answers. No user identifier is sent to Prune.

Setup: create a Prune account, save your provider key under Connect > Providers in the Prune dashboard, then add `PRUNE_API_KEY` and `PRUNE_MODEL` to `.env` and run `python -m scripts.check_prune` to confirm it works. `GET /api/ai/status` shows the active route.
