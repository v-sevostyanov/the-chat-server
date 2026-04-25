import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_SCRYPT_N = 262144;
const MAX_SCRYPT_R = 32;
const MAX_SCRYPT_P = 16;
const MIN_DERIVED_KEY_BYTES = 16;
const MAX_DERIVED_KEY_BYTES = 128;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function isHexString(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[a-f0-9]+$/i.test(value);
}

function deriveScryptKey(
  password: string,
  salt: string,
  keyLength: number,
  options: {
    N: number;
    r: number;
    p: number;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      {
        ...options,
        maxmem: SCRYPT_MAXMEM,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await deriveScryptKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    const parts = encodedHash.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
      return false;
    }

    const [, nValue, rValue, pValue, salt, hashHex] = parts;
    const n = Number(nValue);
    const r = Number(rValue);
    const p = Number(pValue);

    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
      return false;
    }

    if (
      n < 2 ||
      n > MAX_SCRYPT_N ||
      (n & (n - 1)) !== 0 ||
      r < 1 ||
      r > MAX_SCRYPT_R ||
      p < 1 ||
      p > MAX_SCRYPT_P
    ) {
      return false;
    }

    if (!isHexString(salt) || !isHexString(hashHex)) {
      return false;
    }

    const expectedHash = Buffer.from(hashHex, "hex");
    if (
      expectedHash.length < MIN_DERIVED_KEY_BYTES ||
      expectedHash.length > MAX_DERIVED_KEY_BYTES
    ) {
      return false;
    }

    const computedHash = await deriveScryptKey(
      password,
      salt,
      expectedHash.length,
      {
        N: n,
        r,
        p,
      },
    );

    if (expectedHash.length !== computedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, computedHash);
  } catch {
    return false;
  }
}
