import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("hashes with Argon2id and never stores plaintext", async () => {
    const plaintext = "correct-horse-battery";
    const hashed = await hashPassword(plaintext);

    expect(hashed).not.toBe(plaintext);
    expect(hashed.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hashed, plaintext)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hashed = await hashPassword("correct-horse-battery");

    await expect(verifyPassword(hashed, "wrong-password")).resolves.toBe(false);
  });
});
