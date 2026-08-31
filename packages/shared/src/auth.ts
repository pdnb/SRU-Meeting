import * as z from "zod";

// Zod 4 object / email / ISO datetime APIs:
// https://zod.dev/api
// https://zod.dev/

/** Public user. passwordHash never belongs in this contract. */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const RegisterRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const TokenRequestSchema = z.object({
  roomName: z.string().trim().min(1).max(128),
  identity: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(128).optional(),
  password: z.string().min(1).max(128).optional(),
});

export const TokenResponseSchema = z.object({
  token: z.string().min(1),
  url: z.string().min(1),
});

export type User = z.infer<typeof UserSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type TokenRequest = z.infer<typeof TokenRequestSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
