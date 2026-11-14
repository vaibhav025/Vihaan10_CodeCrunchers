from sqlalchemy.types import Text, TypeDecorator

from app.utils.encryption import CONTRIBUTION_AAD, decrypt, encrypt


class EncryptedString(TypeDecorator):
    """Column type that stores a string as authenticated ciphertext."""

    impl = Text
    cache_ok = False

    def __init__(self, purpose: str):
        super().__init__()
        self.aad = f"pensionquest:user:{purpose}:v1".encode()

    def process_bind_param(self, value, dialect):
        return encrypt(value, self.aad) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt(value, self.aad) if isinstance(value, str) and value.startswith("enc:v1:") else value


class EncryptedInteger(TypeDecorator):
    """Column type that stores an integer as authenticated ciphertext."""

    impl = Text
    cache_ok = False

    def __init__(self, purpose: str):
        super().__init__()
        self.aad = f"pensionquest:user:{purpose}:v1".encode()

    def process_bind_param(self, value, dialect):
        return encrypt(str(int(value)), self.aad) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str) and value.startswith("enc:v1:"):
            return int(decrypt(value, self.aad))
        return int(value)


class EncryptedFloat(TypeDecorator):
    """Store numeric amounts as authenticated ciphertext while exposing floats in Python."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt(str(float(value)), CONTRIBUTION_AAD)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str) and value.startswith("enc:v1:"):
            return float(decrypt(value, CONTRIBUTION_AAD))
        # Read legacy plaintext rows until the startup migration re-encrypts them.
        return float(value)
