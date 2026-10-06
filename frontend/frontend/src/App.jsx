import { useEffect, useState } from "react";
import "./App.css";

function formatBytes(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return `${value ?? 0} bytes`;
  }

  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("quantumcrypt-theme") !== "light";
  });

  useEffect(() => {
    document.body.classList.toggle("light-mode", !darkMode);
    localStorage.setItem(
      "quantumcrypt-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [encryptResult, setEncryptResult] = useState(null);
  const [encryptedFile, setEncryptedFile] = useState(null);
  const [decryptKey, setDecryptKey] = useState("");

  const [decryptedImage, setDecryptedImage] = useState(null);
  const [decryptedBlob, setDecryptedBlob] = useState(null);

  const [loading, setLoading] = useState(false);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptMessage, setDecryptMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));

    setEncryptResult(null);
    setDecryptedImage(null);
    setDecryptedBlob(null);
    setDecryptMessage("");
    setDecryptKey("");
  };

  const encryptImage = async () => {
    if (!image) {
      alert("Please select an image first.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("http://127.0.0.1:5000/encrypt", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Encryption failed.");
      }

      setEncryptResult(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "Encryption failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    if (!encryptResult?.key) return;

    try {
      await navigator.clipboard.writeText(encryptResult.key);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const downloadEncryptedFile = () => {
    if (!encryptResult?.encrypted_data) return;

    try {
      const byteCharacters = atob(encryptResult.encrypted_data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${image?.name || "encrypted_image"}.encrypted`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Could not download encrypted file.");
    }
  };

  const downloadEncryptedPixelImage = () => {
    if (!encryptResult?.encrypted_pixel_image) return;

    try {
      const byteCharacters = atob(encryptResult.encrypted_pixel_image);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: "image/png",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "encrypted_pixels.png";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Could not download encrypted pixel image.");
    }
  };

  const handleEncryptedFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setEncryptedFile(file);
    setDecryptedImage(null);
    setDecryptedBlob(null);
    setDecryptMessage("");
  };

  const decryptImage = async () => {
    if (!encryptedFile) {
      setDecryptMessage("Please select an encrypted file.");
      return;
    }

    if (!decryptKey.trim()) {
      setDecryptMessage("Please enter the encryption key.");
      return;
    }

    setDecryptLoading(true);
    setDecryptMessage("");

    const formData = new FormData();

    formData.append("encrypted_file", encryptedFile);
    formData.append("key", decryptKey.trim());

    try {
      const response = await fetch("http://127.0.0.1:5000/decrypt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Decryption failed.";

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore JSON parsing error
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      setDecryptedBlob(blob);
      setDecryptedImage(url);
      setDecryptMessage("Image successfully decrypted.");
    } catch (error) {
      console.error(error);
      setDecryptMessage(error.message || "Decryption failed.");
    } finally {
      setDecryptLoading(false);
    }
  };

  const downloadDecryptedImage = () => {
    if (!decryptedBlob) return;

    const url = URL.createObjectURL(decryptedBlob);
    const link = document.createElement("a");

    link.href = url;

    let filename = encryptedFile?.name || "decrypted_image";

    if (filename.endsWith(".encrypted")) {
      filename = filename.substring(0, filename.length - 10);
    }

    link.download = `decrypted_${filename}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const scrollToEncryption = () => {
    document
      .getElementById("encryption-lab")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-symbol">Q</div>

          <div className="brand-text">
            <div className="brand-name">
              QUANTUM<span>CRYPT</span>
            </div>

            <div className="brand-subtitle">
              IMAGE SECURITY LAB
            </div>
          </div>
        </div>

        <div className="nav-right">
          <div className="protocol">
            <span className="protocol-dot"></span>
            AES-256-GCM
          </div>

          <div className="system-status">
            <span className="status-dot"></span>
            SYSTEM ONLINE
          </div>

          <button
            className="theme-toggle"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label="Toggle theme"
            title={darkMode ? "Switch to bright mode" : "Switch to dark mode"}
          >
            <span className="theme-icon">
              {darkMode ? "☀" : "☾"}
            </span>
            <span>{darkMode ? "BRIGHT" : "DARK"}</span>
          </button>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span></span>
              QUANTUM-ASSISTED SECURITY
            </div>

            <h1>
              Protect your
              <br />
              <span>visual data.</span>
            </h1>

            <p className="hero-description">
              A secure image encryption environment combining
              quantum-generated randomness with AES-256-GCM
              authenticated encryption.
            </p>

            <div className="hero-actions">
              <button
                className="primary-action"
                onClick={scrollToEncryption}
              >
                START SECURE SESSION
                <span>↗</span>
              </button>

              <div className="hero-note">
                <span className="mini-lock">◈</span>
                Local encrypted processing
              </div>
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>256</strong>
                <span>BIT KEY</span>
              </div>

              <div className="metric-divider"></div>

              <div className="hero-metric">
                <strong>AES</strong>
                <span>GCM MODE</span>
              </div>

              <div className="metric-divider"></div>

              <div className="hero-metric">
                <strong>SHA</strong>
                <span>INTEGRITY</span>
              </div>
            </div>
          </div>

          {/* QUANTUM VISUAL */}
          <div className="quantum-console">
            <div className="console-header">
              <div>
                <span className="console-label">
                  LIVE ENTROPY CHANNEL
                </span>
                <strong>QUANTUM CORE / 01</strong>
              </div>

              <span className="live-badge">LIVE</span>
            </div>

            <div className="quantum-stage">
              <div className="grid-floor"></div>

              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>
              <div className="orbit orbit-three"></div>

              <div className="quantum-core">
                <div className="core-inner">Q</div>
              </div>

              <span className="node node-a"></span>
              <span className="node node-b"></span>
              <span className="node node-c"></span>
              <span className="node node-d"></span>

              <div className="visual-label label-top">
                ENTROPY
                <strong>HIGH</strong>
              </div>

              <div className="visual-label label-left">
                RANDOM
                <strong>256 BIT</strong>
              </div>

              <div className="visual-label label-right">
                CHANNEL
                <strong>SECURE</strong>
              </div>

              <div className="visual-label label-bottom">
                KEYSPACE
                <strong>2²⁵⁶</strong>
              </div>
            </div>

            <div className="console-readout">
              <div>
                <span>RANDOMNESS</span>
                <strong>QUANTUM GENERATED</strong>
              </div>

              <div>
                <span>ALGORITHM</span>
                <strong>AES-256-GCM</strong>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="workflow">
          <div className="section-kicker">SECURE WORKFLOW</div>

          <div className="workflow-line">
            <div className="workflow-step active">
              <span>01</span>
              <div>
                <strong>SELECT</strong>
                <small>IMAGE INPUT</small>
              </div>
            </div>

            <div className="workflow-connector"></div>

            <div className="workflow-step">
              <span>02</span>
              <div>
                <strong>RANDOMIZE</strong>
                <small>QUANTUM BITS</small>
              </div>
            </div>

            <div className="workflow-connector"></div>

            <div className="workflow-step">
              <span>03</span>
              <div>
                <strong>ENCRYPT</strong>
                <small>AES-256-GCM</small>
              </div>
            </div>

            <div className="workflow-connector"></div>

            <div className="workflow-step">
              <span>04</span>
              <div>
                <strong>VERIFY</strong>
                <small>SHA-256</small>
              </div>
            </div>
          </div>
        </section>

        {/* ENCRYPTION LAB */}
        <section id="encryption-lab" className="lab-section">
          <div className="section-heading">
            <div className="section-number">01</div>

            <div>
              <div className="section-kicker">
                ENCRYPTION LAB
              </div>

              <h2>
                Generate your
                <span> ciphertext.</span>
              </h2>

              <p>
                Upload an image and initialize a secure encryption
                session.
              </p>
            </div>
          </div>

          <div className="lab-grid">
            {/* UPLOAD PANEL */}
            <div className="lab-panel upload-panel">
              <div className="panel-top">
                <span className="panel-id">INPUT / IMG</span>
                <span className="panel-status">READY</span>
              </div>

              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                {preview ? (
                  <div className="preview-container">
                    <img
                      src={preview}
                      alt="Selected preview"
                    />

                    <div className="preview-overlay">
                      <span>IMAGE LOADED</span>
                      <strong>CLICK TO REPLACE</strong>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-symbol">+</div>

                    <strong>
                      SELECT IMAGE
                    </strong>

                    <span>
                      PNG · JPG · JPEG · WEBP
                    </span>

                    <small>
                      Click anywhere in this panel to browse
                    </small>
                  </div>
                )}
              </label>

              {image && (
                <div className="file-info">
                  <div className="file-icon">IMG</div>

                  <div className="file-details">
                    <strong>{image.name}</strong>
                    <span>
                      {formatBytes(image.size)} · READY FOR ENCRYPTION
                    </span>
                  </div>

                  <div className="file-check">✓</div>
                </div>
              )}

              <button
                className="encrypt-button"
                onClick={encryptImage}
                disabled={loading || !image}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    ENCRYPTING DATA...
                  </>
                ) : (
                  <>
                    INITIALIZE ENCRYPTION
                    <span>→</span>
                  </>
                )}
              </button>
            </div>

            {/* SECURITY PANEL */}
            <div className="lab-panel security-panel">
              <div className="panel-top">
                <span className="panel-id">
                  SECURITY / PROFILE
                </span>

                <span className="secure-mark">●</span>
              </div>

              <div className="security-title">
                <span>PROTOCOL</span>
                <strong>QUANTUM + AES</strong>
              </div>

              <div className="security-list">
                <div className="security-row">
                  <span className="security-index">A1</span>

                  <div>
                    <strong>Randomness Source</strong>
                    <small>
                      Quantum-generated random bits
                    </small>
                  </div>

                  <b>256 BIT</b>
                </div>

                <div className="security-row">
                  <span className="security-index">A2</span>

                  <div>
                    <strong>Encryption Mode</strong>
                    <small>
                      Authenticated symmetric encryption
                    </small>
                  </div>

                  <b>GCM</b>
                </div>

                <div className="security-row">
                  <span className="security-index">A3</span>

                  <div>
                    <strong>Integrity Layer</strong>
                    <small>
                      Cryptographic file verification
                    </small>
                  </div>

                  <b>SHA-256</b>
                </div>

                <div className="security-row">
                  <span className="security-index">A4</span>

                  <div>
                    <strong>Processing</strong>
                    <small>
                      Secure local application workflow
                    </small>
                  </div>

                  <b>LOCAL</b>
                </div>
              </div>

              <div className="security-warning">
                <span>!</span>
                <p>
                  Keep the generated encryption key private.
                  The key is required for successful decryption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ENCRYPTION RESULT */}
        {encryptResult && (
          <section className="result-section">
            <div className="result-banner">
              <div>
                <span className="section-kicker">
                  OUTPUT / CIPHERTEXT
                </span>

                <h2>Encryption complete.</h2>

                <p>
                  Your image has been transformed into encrypted
                  ciphertext.
                </p>
              </div>

              <div className="complete-badge">
                <span>✓</span>
                SECURE
              </div>
            </div>

            {/* STATS */}
            <div className="result-stats">
              <div>
                <span>RANDOM BITS</span>
                <strong>256</strong>
                <small>QUANTUM</small>
              </div>

              <div>
                <span>CIPHER</span>
                <strong>AES</strong>
                <small>GCM-256</small>
              </div>

              <div>
                <span>HASH</span>
                <strong>SHA</strong>
                <small>256</small>
              </div>

              <div>
                <span>OUTPUT</span>
                <strong>
                  {formatBytes(encryptResult.encrypted_size)}
                </strong>
                <small>CIPHERTEXT</small>
              </div>
            </div>

            {/* KEY */}
            <div className="key-section">
              <div className="key-header">
                <div>
                  <span>SECRET MATERIAL</span>
                  <strong>ENCRYPTION KEY</strong>
                </div>

                <span className="key-status">
                  ● PRIVATE
                </span>
              </div>

              <div className="key-display">
                <code>{encryptResult.key}</code>

                <button
                  onClick={copyKey}
                  className={`copy-key-button ${copied ? "copied" : ""}`}
                >
                  {copied ? "✓ COPIED" : "COPY KEY"}
                  {!copied && <span>⧉</span>}
                </button>
              </div>

              <div className="key-warning">
                ⚠ Store this key safely. Without it, the encrypted
                image cannot be decrypted.
              </div>
            </div>

            {/* HASH */}
            <div className="hash-section">
              <div>
                <span>INTEGRITY VERIFICATION</span>
                <strong>SHA-256 HASH</strong>
              </div>

              <code>
                {encryptResult.hash ||
                  encryptResult.sha256 ||
                  "HASH GENERATED BY SERVER"}
              </code>
            </div>

            {/* PIXEL ANALYSIS */}
            {encryptResult.encrypted_pixel_image && (
              <div className="pixel-section">
                <div className="pixel-header">
                  <div>
                    <span>VISUAL ANALYSIS</span>
                    <strong>ENCRYPTED PIXEL MATRIX</strong>
                  </div>

                  <span className="pixel-tag">
                    CIPHERTEXT
                  </span>
                </div>

                <div className="pixel-content">
                  <div className="pixel-image-frame">
                    <img
                      src={`data:image/png;base64,${encryptResult.encrypted_pixel_image}`}
                      alt="Encrypted pixel visualization"
                    />
                  </div>

                  <div className="pixel-description">
                    <div className="analysis-number">
                      01
                    </div>

                    <h3>
                      Original visual
                      <br />
                      structure obscured.
                    </h3>

                    <p>
                      The encrypted pixel representation
                      demonstrates how the original visual
                      information is transformed into
                      ciphertext.
                    </p>

                    <button
                      className="secondary-action"
                      onClick={downloadEncryptedPixelImage}
                    >
                      DOWNLOAD PIXEL MATRIX
                      <span>↓</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DOWNLOAD */}
            <div className="download-bar">
              <div>
                <span>ENCRYPTED FILE</span>
                <strong>
                  {image?.name || "encrypted_image"}.encrypted
                </strong>
              </div>

              <button
                className="download-button"
                onClick={downloadEncryptedFile}
              >
                DOWNLOAD CIPHERTEXT
                <span>↓</span>
              </button>
            </div>
          </section>
        )}

        {/* DECRYPTION LAB */}
        <section className="lab-section decrypt-section">
          <div className="section-heading">
            <div className="section-number violet">
              02
            </div>

            <div>
              <div className="section-kicker">
                DECRYPTION LAB
              </div>

              <h2>
                Restore the
                <span> original.</span>
              </h2>

              <p>
                Provide your encrypted file and its private key
                to recover the original image.
              </p>
            </div>
          </div>

          <div className="lab-grid decrypt-grid">
            {/* ENCRYPTED FILE */}
            <div className="lab-panel">
              <div className="panel-top">
                <span className="panel-id">
                  INPUT / CIPHERTEXT
                </span>

                <span className="panel-status violet-text">
                  WAITING
                </span>
              </div>

              <label className="encrypted-upload">
                <input
                  type="file"
                  onChange={handleEncryptedFile}
                />

                <div className="cipher-icon">
                  ◈
                </div>

                <strong>
                  SELECT ENCRYPTED FILE
                </strong>

                <span>
                  .ENCRYPTED FILE INPUT
                </span>
              </label>

              {encryptedFile && (
                <div className="selected-encrypted">
                  <div className="file-icon encrypted-icon">
                    ENC
                  </div>

                  <div className="file-details">
                    <strong>
                      {encryptedFile.name}
                    </strong>

                    <span>
                      {formatBytes(encryptedFile.size)} · CIPHERTEXT
                    </span>
                  </div>

                  <div className="file-check violet-check">
                    ✓
                  </div>
                </div>
              )}
            </div>

            {/* KEY INPUT */}
            <div className="lab-panel key-input-panel">
              <div className="panel-top">
                <span className="panel-id">
                  AUTH / KEY
                </span>

                <span className="panel-status violet-text">
                  REQUIRED
                </span>
              </div>

              <label className="key-input-label">
                ENCRYPTION KEY
              </label>

              <textarea
                className="decrypt-key-input"
                value={decryptKey}
                onChange={(e) =>
                  setDecryptKey(e.target.value)
                }
                placeholder="Paste your 256-bit encryption key here..."
                spellCheck="false"
              />

              <div className="input-footer">
                <span>
                  PRIVATE KEY
                </span>

                <span>
                  {decryptKey.length} CHARACTERS
                </span>
              </div>
            </div>
          </div>

          <button
            className="decrypt-button"
            onClick={decryptImage}
            disabled={decryptLoading}
          >
            {decryptLoading ? (
              <>
                <span className="spinner violet-spinner"></span>
                RESTORING IMAGE...
              </>
            ) : (
              <>
                DECRYPT & RESTORE IMAGE
                <span>→</span>
              </>
            )}
          </button>

          {decryptMessage && (
            <div
              className={`decrypt-message ${
                decryptMessage.includes("successfully")
                  ? "success"
                  : "error"
              }`}
            >
              <span>
                {decryptMessage.includes("successfully")
                  ? "✓"
                  : "!"}
              </span>

              {decryptMessage}
            </div>
          )}

          {/* DECRYPTED RESULT */}
          {decryptedImage && (
            <div className="decrypted-result">
              <div className="decrypted-header">
                <div>
                  <span>OUTPUT / RESTORED IMAGE</span>
                  <strong>Decryption successful</strong>
                </div>

                <span className="restored-badge">
                  RESTORED
                </span>
              </div>

              <div className="decrypted-content">
                <div className="decrypted-image-frame">
                  <img
                    src={decryptedImage}
                    alt="Decrypted result"
                  />
                </div>

                <div className="decrypted-info">
                  <div className="restore-icon">
                    ✓
                  </div>

                  <h3>
                    Original image
                    <br />
                    recovered.
                  </h3>

                  <p>
                    Authentication succeeded and the encrypted
                    payload was successfully restored.
                  </p>

                  <button
                    className="download-button"
                    onClick={downloadDecryptedImage}
                  >
                    DOWNLOAD RESTORED IMAGE
                    <span>↓</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <span className="footer-q">Q</span>

          <div>
            <strong>QUANTUMCRYPT</strong>
            <small>IMAGE SECURITY LAB</small>
          </div>
        </div>

        <div className="footer-tech">
          <span>QUANTUM RANDOMNESS</span>
          <span>AES-256-GCM</span>
          <span>SHA-256</span>
        </div>

        <div className="footer-copy">
          SECURE VISUAL DATA · 2026
        </div>
      </footer>
    </div>
  );
}

export default App;