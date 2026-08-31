import "server-only";

import { hash, verify } from "@node-rs/argon2";

// Argon2id is the default algorithm (const enum is not usable with isolatedModules).
// API: https://github.com/napi-rs/node-rs/tree/main/packages/argon2
// Defaults: 19 MiB memory, 2 passes, 1 thread (OWASP interactive).

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plaintext, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
