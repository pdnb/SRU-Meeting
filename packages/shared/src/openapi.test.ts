import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

// OpenAPI 3.0 required root fields:
// https://spec.openapis.org/oas/v3.0.3.html#openapi-object
// Info Object required fields:
// https://spec.openapis.org/oas/v3.0.3.html#info-object

const SPEC_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi",
  "v1.yaml",
);

const PHASE1_PATHS = [
  "/api/v1/rooms",
  "/api/v1/rooms/{id}",
  "/api/v1/rooms/{id}/tokens",
  "/api/v1/rooms/{id}/recording",
  "/api/v1/rooms/{id}/breakouts",
  "/api/v1/rooms/{id}/streaming",
  "/api/v1/rooms/{id}/polls",
  "/api/v1/rooms/{id}/questions",
  "/api/v1/rooms/{id}/whiteboard",
  "/api/v1/keys",
  "/api/v1/webhooks",
  "/api/v1/me/personal-room",
  "/api/v1/personal-rooms/{slug}",
] as const;

const REQUIRED_OPERATIONS: Record<string, string[]> = {
  "/api/v1/rooms": ["post", "get"],
  "/api/v1/rooms/{id}": ["get", "delete"],
  "/api/v1/rooms/{id}/tokens": ["post"],
  "/api/v1/rooms/{id}/recording": ["post", "delete", "get"],
  "/api/v1/rooms/{id}/breakouts": ["post", "get", "delete", "patch"],
  "/api/v1/rooms/{id}/streaming": ["post", "delete", "get", "patch"],
  "/api/v1/rooms/{id}/polls": ["post", "get", "delete"],
  "/api/v1/rooms/{id}/questions": ["post", "get", "patch"],
  "/api/v1/rooms/{id}/whiteboard": ["post", "get", "delete"],
  "/api/v1/keys": ["get", "post"],
  "/api/v1/webhooks": ["get", "post"],
  "/api/v1/me/personal-room": ["get"],
  "/api/v1/personal-rooms/{slug}": ["get"],
};

/** Zod schema names from Task 4 (packages/shared/src/*.ts). */
const ZOD_SCHEMA_NAMES = new Set([
  "ApiErrorSchema",
  "ChatMessageSchema",
  "CreateChatMessageRequestSchema",
  "CreateRoomRequestSchema",
  "LobbyStatusSchema",
  "RoomParticipantSchema",
  "RoomRoleSchema",
  "RoomSchema",
  "RoomKindSchema",
  "PersonalRoomSchema",
  "TokenRequestSchema",
  "TokenResponseSchema",
  "UserSchema",
  "OrgRoleSchema",
  "LdapLoginRequestSchema",
  "RecordingModeSchema",
  "RecordingStatusSchema",
  "RecordingSchema",
  "StartRecordingRequestSchema",
  "ApiKeyPublicSchema",
  "CreateApiKeyRequestSchema",
  "CreateApiKeyResponseSchema",
  "WebhookEventNameSchema",
  "WebhookEndpointSchema",
  "CreateWebhookEndpointRequestSchema",
  "CreateWebhookEndpointResponseSchema",
  "AuditLogSchema",
  "BreakoutAssignmentModeSchema",
  "BreakoutSessionStatusSchema",
  "CreateBreakoutsRequestSchema",
  "BreakoutAssignmentSchema",
  "BreakoutSessionSchema",
  "BreakoutActionRequestSchema",
  "BreakoutPacketSchema",
  "StartStreamRequestSchema",
  "UpdateStreamRequestSchema",
  "StreamSchema",
  "PollStatusSchema",
  "PollOptionSchema",
  "PollSchema",
  "CreatePollRequestSchema",
  "VotePollRequestSchema",
  "PollPacketSchema",
  "QuestionStatusSchema",
  "QuestionSchema",
  "SubmitQuestionRequestSchema",
  "ModerateQuestionRequestSchema",
  "QaPacketSchema",
  "WhiteboardSessionStatusSchema",
  "WhiteboardSessionSchema",
  "OpenWhiteboardRequestSchema",
  "CloseWhiteboardRequestSchema",
  "WhiteboardPacketSchema",
  "TranscriptStatusSchema",
  "MeetingSummaryStatusSchema",
  "TranscriptSegmentSchema",
  "TranscriptSchema",
  "MeetingSummarySchema",
  "TranscriptionSegmentInputSchema",
  "DailyOrgMetricsSchema",
  "AnalyticsTotalsSchema",
  "AnalyticsOverviewSchema",
  "SubmitQosReportRequestSchema",
  "QosReportSchema",
  "RoomQosSummarySchema",
]);

const REQUIRED_SCHEMA_NAMES = [
  "ApiErrorSchema",
  "CreateRoomRequestSchema",
  "LobbyStatusSchema",
  "RoomParticipantSchema",
  "RoomRoleSchema",
  "RoomSchema",
  "TokenRequestSchema",
  "TokenResponseSchema",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

describe("OpenAPI v1 skeleton", () => {
  it("validates as OpenAPI 3 and lists the Phase 1 room and token paths", () => {
    expect(existsSync(SPEC_PATH)).toBe(true);

    const document: unknown = parse(readFileSync(SPEC_PATH, "utf8"));
    expect(isRecord(document)).toBe(true);
    if (!isRecord(document)) {
      return;
    }

    expect(document.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(isRecord(document.info)).toBe(true);
    if (!isRecord(document.info)) {
      return;
    }
    expect(typeof document.info.title).toBe("string");
    expect((document.info.title as string).length).toBeGreaterThan(0);
    expect(typeof document.info.version).toBe("string");
    expect((document.info.version as string).length).toBeGreaterThan(0);

    expect(isRecord(document.paths)).toBe(true);
    if (!isRecord(document.paths)) {
      return;
    }

    for (const path of PHASE1_PATHS) {
      expect(document.paths, `missing path ${path}`).toHaveProperty(path);
      const item = document.paths[path];
      expect(isRecord(item)).toBe(true);
      if (!isRecord(item)) {
        continue;
      }
      for (const method of REQUIRED_OPERATIONS[path] ?? []) {
        expect(item, `${method.toUpperCase()} ${path}`).toHaveProperty(method);
      }
    }

    expect(isRecord(document.components)).toBe(true);
    if (!isRecord(document.components)) {
      return;
    }
    expect(isRecord(document.components.schemas)).toBe(true);
    if (!isRecord(document.components.schemas)) {
      return;
    }

    const schemaNames = Object.keys(document.components.schemas);
    for (const name of REQUIRED_SCHEMA_NAMES) {
      expect(schemaNames).toContain(name);
    }
    for (const name of schemaNames) {
      expect(ZOD_SCHEMA_NAMES.has(name), `unknown schema name ${name}`).toBe(
        true,
      );
    }
  });
});
