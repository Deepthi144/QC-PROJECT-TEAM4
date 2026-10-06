from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
import base64
import hashlib


def encrypt_image(image_data, key):
    """
    Encrypt image bytes using AES-256-GCM.
    """

    if len(key) != 32:
        raise ValueError("AES-256 key must be exactly 32 bytes")

    # Generate a unique 12-byte nonce
    nonce = secrets.token_bytes(12)

    # Create AES-GCM cipher
    aes = AESGCM(key)

    # Encrypt image
    encrypted_data = aes.encrypt(
        nonce,
        image_data,
        None
    )

    # SHA-256 hash of original image
    original_hash = hashlib.sha256(
        image_data
    ).hexdigest()

    # Store nonce + encrypted data
    final_data = nonce + encrypted_data

    # Convert to Base64 for sending through API
    encrypted_base64 = base64.b64encode(
        final_data
    ).decode("utf-8")

    return encrypted_base64, original_hash