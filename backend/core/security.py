from cryptography.fernet import Fernet, InvalidToken


from config import settings

def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key:
        raise RuntimeError("ENCRYPTION_KEY is not configured")
    stripped_key = key.strip()
    if len(stripped_key) != 44:
        raise RuntimeError(f"ENCRYPTION_KEY must be exactly 44 characters, got {len(stripped_key)}")
    return Fernet(stripped_key.encode("utf-8"))


def encrypt_api_key(api_key: str) -> str:
    if not api_key or not api_key.strip():
        raise ValueError("API key cannot be empty")
    fernet = _get_fernet()
    return fernet.encrypt(api_key.strip().encode("utf-8")).decode("utf-8")


def decrypt_api_key(encrypted_api_key: str) -> str:
    if not encrypted_api_key:
        raise ValueError("Encrypted API key is missing")
    fernet = _get_fernet()
    try:
        return fernet.decrypt(encrypted_api_key.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Stored API key could not be decrypted") from exc
