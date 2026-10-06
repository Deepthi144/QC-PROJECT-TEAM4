from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import hashlib


def decrypt_image(encrypted_base64, key):
    """
    Decrypt AES-256-GCM encrypted image data.
    """

    if len(key) != 32:
        raise ValueError("AES-256 key must be exactly 32 bytes")

    # Decode Base64
    encrypted_data = base64.b64decode(
        encrypted_base64
    )

    # First 12 bytes are the nonce
    nonce = encrypted_data[:12]

    # Remaining bytes are ciphertext + authentication tag
    ciphertext = encrypted_data[12:]

    # Create AES-GCM cipher
    aes = AESGCM(key)

    # Decrypt
    decrypted_data = aes.decrypt(
        nonce,
        ciphertext,
        None
    )

    # SHA-256 hash of decrypted image
    decrypted_hash = hashlib.sha256(
        decrypted_data
    ).hexdigest()

    return decrypted_data, decrypted_hash