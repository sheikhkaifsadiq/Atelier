import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;
const PEPPER = process.env.PASSWORD_PEPPER || "";

if (!PEPPER) {
  // Don't crash, but warn loudly. Production should always have one.
  // eslint-disable-next-line no-console
  console.warn(
    "[security] PASSWORD_PEPPER is empty. Set it in .env before going to production."
  );
}

/**
 * Apply HMAC-SHA256 pepper to the raw password BEFORE bcrypt.
 * Result is a fixed-length hex string, so the 72-byte bcrypt input limit
 * never bites us regardless of original password length.
 */
const pepper = (password) =>
  crypto.createHmac("sha256", PEPPER).update(String(password)).digest("hex");

export const hashPassword = async (password) => {
  return bcrypt.hash(pepper(password), SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  if (!hash) return false;
  // Try peppered (new) hashes first…
  if (await bcrypt.compare(pepper(password), hash)) return true;
  // …fall back to legacy unsalted-pepper hashes for migration.
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
};

/**
 * If `password` verifies against `oldHash` via the legacy path, returns a
 * fresh peppered hash. Otherwise returns null. Use this to silently upgrade
 * users on successful login.
 */
export const upgradeLegacyHashIfNeeded = async (password, oldHash) => {
  if (!oldHash) return null;
  if (await bcrypt.compare(pepper(password), oldHash)) return null; // already new
  const ok = await bcrypt.compare(password, oldHash).catch(() => false);
  if (!ok) return null;
  return hashPassword(password);
};
