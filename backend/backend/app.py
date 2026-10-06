from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from quantum_key import generate_aes_key
from encryption import encrypt_image
from decryption import decrypt_image

import base64
import io
import os
import numpy as np

from PIL import Image


app = Flask(__name__)
CORS(app)


# =========================================
# HOME
# =========================================

@app.route("/")
def home():

    return jsonify({
        "message": "Quantum Image Encryption API is running"
    })


# =========================================
# CREATE ENCRYPTED PIXEL VISUALIZATION
# =========================================

def create_encrypted_pixel_image(
    encrypted_base64,
    width,
    height
):

    encrypted_bytes = base64.b64decode(
        encrypted_base64
    )

    if len(encrypted_bytes) == 0:

        raise ValueError(
            "Encrypted data is empty"
        )

    # Keep visualization size reasonable
    max_pixels = 1200000

    total_pixels = width * height

    if total_pixels > max_pixels:

        scale = (
            max_pixels /
            total_pixels
        )

        width = max(
            1,
            int(width * (scale ** 0.5))
        )

        height = max(
            1,
            int(height * (scale ** 0.5))
        )


    required_bytes = (
        width *
        height *
        3
    )


    # Repeat ciphertext bytes so
    # they can fill the RGB image
    repeated_bytes = (
        encrypted_bytes *
        (
            required_bytes //
            len(encrypted_bytes) + 1
        )
    )


    pixel_bytes = repeated_bytes[
        :required_bytes
    ]


    pixels = np.frombuffer(
        pixel_bytes,
        dtype=np.uint8
    )


    pixels = pixels.reshape(
        (height, width, 3)
    )


    encrypted_image = Image.fromarray(
        pixels,
        "RGB"
    )


    output = io.BytesIO()


    encrypted_image.save(
        output,
        format="PNG"
    )


    output.seek(0)


    visualization_base64 = (
        base64.b64encode(
            output.getvalue()
        ).decode("utf-8")
    )


    return visualization_base64


# =========================================
# ENCRYPT IMAGE
# =========================================

@app.route(
    "/encrypt",
    methods=["POST"]
)
def encrypt():

    try:

        if "image" not in request.files:

            return jsonify({

                "success": False,

                "error":
                    "No image uploaded"

            }), 400


        image = request.files["image"]


        if image.filename == "":

            return jsonify({

                "success": False,

                "error":
                    "No image selected"

            }), 400


        image_data = image.read()


        if len(image_data) == 0:

            return jsonify({

                "success": False,

                "error":
                    "Empty image file"

            }), 400


        # =====================================
        # READ ORIGINAL IMAGE SIZE
        # =====================================

        try:

            original_image = Image.open(
                io.BytesIO(image_data)
            )

            width, height = (
                original_image.size
            )

        except Exception:

            width = 512
            height = 512


        # =====================================
        # GENERATE QUANTUM KEY
        # =====================================

        key, encoded_key, quantum_bits = (
            generate_aes_key()
        )


        # =====================================
        # AES ENCRYPTION
        # =====================================

        encrypted_data, original_hash = (
            encrypt_image(
                image_data,
                key
            )
        )


        # =====================================
        # CREATE ENCRYPTED PIXEL IMAGE
        # =====================================

        encrypted_pixel_image = (
            create_encrypted_pixel_image(
                encrypted_data,
                width,
                height
            )
        )


        # =====================================
        # RETURN RESULT
        # =====================================

        return jsonify({

            "success": True,

            "message":
                "Image encrypted successfully",

            "filename":
                image.filename,

            "original_size":
                len(image_data),

            "encrypted_size":
                len(encrypted_data),

            "width":
                width,

            "height":
                height,

            "quantum_bits":
                quantum_bits,

            "key":
                encoded_key,

            "sha256":
                original_hash,

            # Actual encrypted file data
            "encrypted_data":
                encrypted_data,

            # Viewable encrypted pixel PNG
            "encrypted_pixel_image":
                encrypted_pixel_image
        })


    except Exception as e:

        print(
            "Encryption Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================
# DECRYPT IMAGE
# =========================================

@app.route(
    "/decrypt",
    methods=["POST"]
)
def decrypt():

    try:

        # =====================================
        # CHECK FILE
        # =====================================

        if "encrypted_file" not in request.files:

            return jsonify({

                "success": False,

                "error":
                    "No encrypted file uploaded"

            }), 400


        encrypted_file = (
            request.files["encrypted_file"]
        )


        # =====================================
        # GET KEY
        # =====================================

        pasted_key = request.form.get(
            "key"
        )


        if not pasted_key:

            return jsonify({

                "success": False,

                "error":
                    "Please paste the encryption key"

            }), 400


        pasted_key = pasted_key.strip()


        # =====================================
        # CONVERT KEY
        # =====================================

        key = None


        # Try HEX
        if len(pasted_key) == 64:

            try:

                key = bytes.fromhex(
                    pasted_key
                )

            except ValueError:

                key = None


        # Try Base64
        if key is None:

            try:

                key = base64.b64decode(
                    pasted_key,
                    validate=True
                )

            except Exception:

                return jsonify({

                    "success": False,

                    "error":
                        "Invalid encryption key"

                }), 400


        # =====================================
        # CHECK AES-256
        # =====================================

        if len(key) != 32:

            return jsonify({

                "success": False,

                "error":
                    "Invalid AES-256 key. Key must be 256 bits."

            }), 400


        # =====================================
        # READ ENCRYPTED FILE
        # =====================================

        encrypted_file_data = (
            encrypted_file.read()
        )


        if len(encrypted_file_data) == 0:

            return jsonify({

                "success": False,

                "error":
                    "Encrypted file is empty"

            }), 400


        # =====================================
        # SUPPORT BASE64 AND RAW FILE
        # =====================================

        encrypted_base64 = None


        # Try Base64 text
        try:

            possible_base64 = (
                encrypted_file_data
                .decode("utf-8")
                .strip()
            )


            decoded_test = (
                base64.b64decode(
                    possible_base64,
                    validate=True
                )
            )


            if len(decoded_test) >= 12:

                encrypted_base64 = (
                    possible_base64
                )


        except Exception:

            encrypted_base64 = None


        # Raw binary
        if encrypted_base64 is None:

            encrypted_base64 = (
                base64.b64encode(
                    encrypted_file_data
                ).decode("utf-8")
            )


        # =====================================
        # DECRYPT
        # =====================================

        try:

            decrypted_data, decrypted_hash = (
                decrypt_image(
                    encrypted_base64,
                    key
                )
            )

        except Exception as e:

            print(
                "AES Decryption Error:",
                str(e)
            )

            return jsonify({

                "success": False,

                "error":
                    "Decryption failed. Wrong key or corrupted encrypted file."

            }), 400


        # =====================================
        # DETERMINE ORIGINAL FILENAME
        # =====================================

        original_filename = (
            encrypted_file.filename
            or "decrypted_image.png"
        )


        if original_filename.lower().endswith(
            ".encrypted"
        ):

            original_filename = (
                original_filename[:-10]
            )


        # =====================================
        # IMAGE EXTENSION
        # =====================================

        valid_extensions = [
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".bmp"
        ]


        if not any(
            original_filename.lower().endswith(
                ext
            )
            for ext in valid_extensions
        ):

            original_filename += ".png"


        # =====================================
        # MIME TYPE
        # =====================================

        lower_name = (
            original_filename.lower()
        )


        if (
            lower_name.endswith(".jpg")
            or
            lower_name.endswith(".jpeg")
        ):

            mimetype = "image/jpeg"


        elif lower_name.endswith(".png"):

            mimetype = "image/png"


        elif lower_name.endswith(".webp"):

            mimetype = "image/webp"


        elif lower_name.endswith(".bmp"):

            mimetype = "image/bmp"


        else:

            mimetype = (
                "application/octet-stream"
            )


        # =====================================
        # SEND DECRYPTED IMAGE
        # =====================================

        return send_file(

            io.BytesIO(
                decrypted_data
            ),

            mimetype=mimetype,

            as_attachment=True,

            download_name=original_filename
        )


    except Exception as e:

        print(
            "Decryption Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                "Decryption failed."

        }), 400

# =========================================
# RUN SERVER
# =========================================

if __name__ == "__main__":
    import os

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
