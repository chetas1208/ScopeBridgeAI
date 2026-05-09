// ScopeBridge AI — AES-256-GCM encryption (Node.js built-in crypto only)
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag (GCM default)
const KEY_HEX_LENGTH = 64; // 32 bytes = 64 hex chars

function getKey(): Buffer {
  const keyHex = process.env.APP_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32"
    );
  }
  if (keyHex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      `APP_ENCRYPTION_KEY must be exactly ${KEY_HEX_LENGTH} hex characters (32 bytes). Got ${keyHex.length}.`
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns "iv_hex:tag_hex:data_hex"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext produced by encrypt().
 * Throws if the ciphertext is malformed or the auth tag fails.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format — expected iv:tag:data");
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Returns true if the value looks like an encrypted string (iv:tag:data hex format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  return parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
