from quantum_key import generate_aes_key

key, encoded_key, bits = generate_aes_key()

print("Quantum Bits:")
print(bits)

print()

print("Number of bits:")
print(len(bits))

print()

print("AES Key:")
print(encoded_key)

print()

print("Key Length:")
print(len(key) * 8)