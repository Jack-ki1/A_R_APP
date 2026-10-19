import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_SALT = "breakout-radar-provider-keys-v1";
const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const passphrase = process.env["PROVIDER_ENCRYPTION_KEY"];
  if (!passphrase || passphrase.length < 16)
    throw new Error(
      "PROVIDER_ENCRYPTION_KEY is missing or too short. Set it to a strong random secret (32+ characters) in the server environment.",
    );
  return scryptSync(passphrase, KEY_SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64)
    throw new Error("Stored credential is malformed and cannot be decrypted.");
  try {
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Stored credential could not be decrypted. PROVIDER_ENCRYPTION_KEY may have changed — reconnect the provider with a new key.",
    );
  }
}

export function keyHint(plaintext: string): string {
  return `...${plaintext.slice(-4)}`;
}
