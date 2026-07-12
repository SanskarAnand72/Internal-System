import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Derives a key of exactly 32 bytes from the ENCRYPTION_KEY environment variable,
 * falling back to a default key for local/dev environments.
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || "fallback_secret_key_32_characters_long!";
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypts cleartext using AES-256-CBC.
 * Returns IV and ciphertext joined by a colon.
 *
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted string format "iv:ciphertext"
 */
export function encrypt(text) {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (e) {
    console.error("[Encryption] Encryption failed:", e.message);
    throw new Error(`Failed to encrypt password: ${e.message}`);
  }
}

/**
 * Decrypts a ciphertext in the format "iv:ciphertext".
 * Falls back to returning the input string if decryption fails or format is invalid.
 *
 * @param {string} encryptedText - Encrypted string to decrypt
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      // Return raw input if it doesn't match iv:ciphertext format (fallback for legacy plaintext)
      return encryptedText;
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.warn("[Encryption] Decryption failed, treating as plaintext fallback:", e.message);
    return encryptedText;
  }
}
