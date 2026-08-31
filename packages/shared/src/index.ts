export const PACKAGE_NAME = "@sru/shared" as const;

export {
  ApiErrorSchema,
  type ApiError,
} from "./error";

export {
  ChatMessageSchema,
  CreateChatMessageRequestSchema,
  type ChatMessage,
  type CreateChatMessageRequest,
} from "./chat";

export {
  LobbyStatusSchema,
  RoomParticipantSchema,
  RoomRoleSchema,
  RoomSchema,
  CreateRoomRequestSchema,
  UpdateRoomSettingsSchema,
  type LobbyStatus,
  type Room,
  type RoomParticipant,
  type RoomRole,
  type CreateRoomRequest,
  type UpdateRoomSettings,
} from "./room";

export {
  LoginRequestSchema,
  RegisterRequestSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  UserSchema,
  type LoginRequest,
  type RegisterRequest,
  type TokenRequest,
  type TokenResponse,
  type User,
} from "./auth";
