import * as z from "zod";

// Zod 4 object / enum / string APIs:
// https://zod.dev/api
// https://zod.dev/

export const RoomRoleSchema = z.enum(["host", "cohost", "participant"]);
export const LobbyStatusSchema = z.enum(["pending", "admitted", "denied"]);
export const RoomKindSchema = z.enum(["adhoc", "personal"]);

/** Vanity slug for Personal Rooms: lowercase letters, digits, dots, hyphens. */
export const PersonalRoomSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const CreateRoomRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.iso.datetime(),
  ownerId: z.string().min(1),
  kind: RoomKindSchema.optional(),
  slug: z.string().nullable().optional(),
  hasPassword: z.boolean().optional(),
  lobbyEnabled: z.boolean().optional(),
  locked: z.boolean().optional(),
  finishedAt: z.iso.datetime().nullable().optional(),
  allowGuests: z.boolean().optional(),
  signedInOnly: z.boolean().optional(),
  allowedEmailDomains: z.array(z.string()).optional(),
  allowScreenShare: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  e2eeEnabled: z.boolean().optional(),
  maxParticipants: z.number().int().positive().optional(),
  parentRoomId: z.string().min(1).nullable().optional(),
});

export const PersonalRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: PersonalRoomSlugSchema,
  joinPath: z.string().min(1),
});

export const UpdateRoomSettingsSchema = z.object({
  password: z.string().min(1).max(128).nullable().optional(),
  lobbyEnabled: z.boolean().optional(),
  allowGuests: z.boolean().optional(),
  signedInOnly: z.boolean().optional(),
  allowedEmailDomains: z
    .array(z.string().trim().min(1).max(253))
    .max(20)
    .optional(),
  allowScreenShare: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  e2eeEnabled: z.boolean().optional(),
  maxParticipants: z.number().int().min(1).max(25).optional(),
});

export const RoomParticipantSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  userId: z.string().min(1),
  role: RoomRoleSchema,
  banned: z.boolean(),
  lobbyStatus: LobbyStatusSchema,
});

export type RoomRole = z.infer<typeof RoomRoleSchema>;
export type LobbyStatus = z.infer<typeof LobbyStatusSchema>;
export type RoomKind = z.infer<typeof RoomKindSchema>;
export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;
export type UpdateRoomSettings = z.infer<typeof UpdateRoomSettingsSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;
export type PersonalRoom = z.infer<typeof PersonalRoomSchema>;
