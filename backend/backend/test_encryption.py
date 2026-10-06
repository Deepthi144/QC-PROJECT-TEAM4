from quantum_key import generate_aes_key
from encryption import encrypt_image
from decryption import decrypt_image


# Test image data
original_data = b"This is a quantum image encryption test."


# Generate quantum key
key, encoded_key, quantum_bits = generate_aes_key()

print("Quantum key generated")
print("Key length:", len(key) * 8)


# Encrypt
encrypted_data, original_hash = encrypt_image(
    original_data,
    key
)

print("\nEncryption successful")
print("Original SHA-256:")
print(original_hash)


# Decrypt
decrypted_data, decrypted_hash = decrypt_image(
    encrypted_data,
    key
)

print("\nDecryption successful")
print("Decrypted SHA-256:")
print(decrypted_hash)


# Verify
if original_data == decrypted_data:
    print("\n✅ SUCCESS: Original and decrypted data match!")
else:
    print("\n❌ ERROR: Data does not match!")