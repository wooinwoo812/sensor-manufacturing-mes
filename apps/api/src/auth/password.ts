import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;
const version = "scrypt-v1";

export async function hashPassword(password: string, salt?: string) {
  const passwordSalt = salt ?? randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(
    password,
    passwordSalt,
    keyLength,
  )) as Buffer;

  return `${version}$${passwordSalt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [encodedVersion, salt, expected] = encodedHash.split("$");
  if (encodedVersion !== version || salt === undefined || expected === undefined) {
    return false;
  }

  const expectedKey = Buffer.from(expected, "base64url");
  if (expectedKey.length !== keyLength) {
    return false;
  }

  const actualKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}
