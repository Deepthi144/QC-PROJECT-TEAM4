from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
import base64


def generate_quantum_random_bits(number_of_bits=256):

    bits = ""

    simulator = AerSimulator()

    for _ in range(number_of_bits):

        circuit = QuantumCircuit(1, 1)

        # Put qubit into superposition
        circuit.h(0)

        # Measure the qubit
        circuit.measure(0, 0)

        result = simulator.run(
            circuit,
            shots=1
        ).result()

        counts = result.get_counts()

        bit = list(counts.keys())[0]

        bits += bit

    return bits


def generate_aes_key():

    quantum_bits = generate_quantum_random_bits(256)

    key_bytes = int(
        quantum_bits,
        2
    ).to_bytes(
        32,
        byteorder="big"
    )

    encoded_key = base64.b64encode(
        key_bytes
    ).decode("utf-8")

    return key_bytes, encoded_key, quantum_bits