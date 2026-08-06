import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Use META_APP_SECRET from process.env as the base key; fallback to a secure default if undefined
const rawKey = process.env["META_APP_SECRET"] || "default_engageai_crypt_secret_key_32_bytes";
const ENCRYPTION_KEY = createHash("sha256").update(rawKey).digest(); // 32 bytes key

/**
 * Encrypts a string using AES-256-CBC.
 * Returns the IV and ciphertext separated by a colon.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Failed to encrypt credentials");
  }
}

/**
 * Decrypts an AES-256-CBC encrypted string.
 * Supports a graceful fallback if the string is not encrypted (e.g. old plain data).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  
  // If not in "iv:ciphertext" format, treat as plain text for migration/fallback
  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts.shift() || "", "hex");
    const encrypted = parts.join(":");
    const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed (treating as plain):", err);
    return encryptedText; // Graceful fallback
  }
}
