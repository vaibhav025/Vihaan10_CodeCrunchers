"""Authenticated encryption for sensitive financial records.

The key is supplied through DATA_ENCRYPTION_KEY and is never stored in the database.
Generate it with: python -c 'import secrets,base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())'
"""
import base64
import hashlib
import hmac
import json
import secrets
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

AAD = b"pensionquest:financial-data:v1"
CONTRIBUTION_AAD = b"pensionquest:contribution-amount:v1"
KEY_ID = "primary"
PREFIX = f"enc:v1:{KEY_ID}:"


class EncryptionConfigurationError(RuntimeError):
    pass


def _key() -> bytes:
    encoded = settings.DATA_ENCRYPTION_KEY.strip()
    if not encoded:
        raise EncryptionConfigurationError("DATA_ENCRYPTION_KEY must be configured before financial data can be used")
    try:
        key = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    except Exception as exc:
        raise EncryptionConfigurationError("DATA_ENCRYPTION_KEY must be a base64 encoded 32-byte key") from exc
    if len(key) != 32:
        raise EncryptionConfigurationError("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes")
    return key


def validate_key() -> None:
    _key()


def email_fingerprint(email: str) -> str:
    """Non-reversible keyed index so login never queries encrypted email ciphertext."""
    index_key = hashlib.sha256(b"pensionquest:email-index:v1:" + _key()).digest()
    normalized = email.strip().lower().encode("utf-8")
    return hmac.new(index_key, normalized, hashlib.sha256).hexdigest()


def encrypt(plaintext: str, aad: bytes = AAD) -> str:
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), aad)
    return PREFIX + base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt(ciphertext: str, aad: bytes = AAD) -> str:
    if not ciphertext.startswith("enc:v1:"):
        raise ValueError("Financial data is not encrypted with the current format")
    try:
        parts = ciphertext.split(":", 3)
        # Backward compatible read for the first unaffiliated-key-id format.
        encoded = parts[3] if len(parts) == 4 else parts[2]
        raw = base64.urlsafe_b64decode(encoded)
        return AESGCM(_key()).decrypt(raw[:12], raw[12:], aad).decode("utf-8")
    except InvalidTag as exc:
        raise ValueError("Financial data could not be authenticated") from exc


def encrypt_data(data: dict[str, Any]) -> str:
    return encrypt(json.dumps(data, separators=(",", ":"), sort_keys=True))


def decrypt_data(value: Any) -> dict[str, Any]:
    # Plain JSON objects are legacy records; callers must re-encrypt them before returning.
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.startswith(PREFIX):
        decoded = json.loads(decrypt(value))
        if isinstance(decoded, dict):
            return decoded
    raise ValueError("Stored financial data has an unsupported format")
