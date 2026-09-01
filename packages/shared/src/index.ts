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
  E2EE_INCOMPATIBLE_CODE,
  E2EE_KEY_DATA_TOPIC,
  E2eeFeatureSchema,
  E2eeDegradedFeatureSchema,
  E2eePolicyMatrixSchema,
  E2eeKeyPacketSchema,
  buildE2eePolicyMatrix,
  e2eeIncompatibleMessage,
  type E2eeFeature,
  type E2eeDegradedFeature,
  type E2eePolicyMatrix,
  type E2eeKeyPacket,
} from "./e2ee";

export {
  LoginRequestSchema,
  LdapLoginRequestSchema,
  RegisterRequestSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  UserSchema,
  type LoginRequest,
  type LdapLoginRequest,
  type RegisterRequest,
  type TokenRequest,
  type TokenResponse,
  type User,
} from "./auth";

export { OrgRoleSchema, type OrgRole } from "./org";

export {
  RecordingModeSchema,
  RecordingStatusSchema,
  RecordingSchema,
  StartRecordingRequestSchema,
  type Recording,
  type RecordingMode,
  type RecordingStatus,
  type StartRecordingRequest,
} from "./recording";

export {
  StartStreamRequestSchema,
  UpdateStreamRequestSchema,
  StreamSchema,
  type StartStreamRequest,
  type UpdateStreamRequest,
  type Stream,
} from "./stream";

export {
  ApiKeyPublicSchema,
  CreateApiKeyRequestSchema,
  CreateApiKeyResponseSchema,
  type ApiKeyPublic,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
} from "./api-key";

export {
  WebhookEventNameSchema,
  WebhookEndpointSchema,
  CreateWebhookEndpointRequestSchema,
  CreateWebhookEndpointResponseSchema,
  type WebhookEventName,
  type WebhookEndpoint,
  type CreateWebhookEndpointRequest,
  type CreateWebhookEndpointResponse,
} from "./webhook";

export { AuditLogSchema, type AuditLog } from "./audit";

export {
  BreakoutAssignmentModeSchema,
  BreakoutSessionStatusSchema,
  CreateBreakoutsRequestSchema,
  BreakoutAssignmentSchema,
  BreakoutSessionSchema,
  BreakoutActionRequestSchema,
  BreakoutPacketSchema,
  type BreakoutAssignmentMode,
  type BreakoutSessionStatus,
  type CreateBreakoutsRequest,
  type BreakoutAssignment,
  type BreakoutSession,
  type BreakoutActionRequest,
  type BreakoutPacket,
} from "./breakout";

export {
  PollStatusSchema,
  PollOptionSchema,
  PollSchema,
  CreatePollRequestSchema,
  VotePollRequestSchema,
  PollPacketSchema,
  POLL_DATA_TOPIC,
  type PollStatus,
  type PollOption,
  type Poll,
  type CreatePollRequest,
  type VotePollRequest,
  type PollPacket,
} from "./poll";

export {
  QuestionStatusSchema,
  QuestionSchema,
  SubmitQuestionRequestSchema,
  ModerateQuestionRequestSchema,
  QaPacketSchema,
  QA_DATA_TOPIC,
  type QuestionStatus,
  type Question,
  type SubmitQuestionRequest,
  type ModerateQuestionRequest,
  type QaPacket,
} from "./question";

export {
  WhiteboardSessionStatusSchema,
  WhiteboardSessionSchema,
  OpenWhiteboardRequestSchema,
  CloseWhiteboardRequestSchema,
  WhiteboardPacketSchema,
  WHITEBOARD_DATA_TOPIC,
  type WhiteboardSessionStatus,
  type WhiteboardSession,
  type OpenWhiteboardRequest,
  type CloseWhiteboardRequest,
  type WhiteboardPacket,
} from "./whiteboard";

export {
  TranscriptStatusSchema,
  MeetingSummaryStatusSchema,
  TranscriptSegmentSchema,
  TranscriptSchema,
  MeetingSummarySchema,
  TranscriptionSegmentInputSchema,
  type TranscriptStatus,
  type MeetingSummaryStatus,
  type TranscriptSegment,
  type Transcript,
  type MeetingSummary,
  type TranscriptionSegmentInput,
} from "./transcript";

export {
  DailyOrgMetricsSchema,
  AnalyticsTotalsSchema,
  AnalyticsOverviewSchema,
  SubmitQosReportRequestSchema,
  QosReportSchema,
  RoomQosSummarySchema,
  type DailyOrgMetrics,
  type AnalyticsTotals,
  type AnalyticsOverview,
  type SubmitQosReportRequest,
  type QosReport,
  type RoomQosSummary,
} from "./analytics";
