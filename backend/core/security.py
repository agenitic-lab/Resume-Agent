import os
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _get_fernet() -> Fernet:
    key = os.getenv("USER_API_KEY_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("USER_API_KEY_ENCRYPTION_KEY is not configured")
    return Fernet(key.encode("utf-8"))


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
