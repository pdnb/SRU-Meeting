/**
 * Server-facing re-exports so Route Handlers and UI import Room/token
 * shapes from @sru/shared only — no second Room type in apps/web.
 */
export {
  CreateRoomRequestSchema,
  RoomSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  type CreateRoomRequest,
  type Room,
  type TokenRequest,
  type TokenResponse,
} from "@sru/shared";
