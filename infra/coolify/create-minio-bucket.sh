#!/usr/bin/env bash
# Run on the Coolify Linux host after first successful deploy.
# Creates the MinIO bucket used by chat attachments + recordings.
set -euo pipefail

MINIO_CONTAINER="${MINIO_CONTAINER:-$(docker ps --format '{{.Names}}' | grep -i minio | head -n1)}"
if [[ -z "${MINIO_CONTAINER}" ]]; then
  echo "No running minio container found. Set MINIO_CONTAINER=<name>." >&2
  exit 1
fi

if [[ -z "${MINIO_ROOT_USER:-}" || -z "${MINIO_ROOT_PASSWORD:-}" ]]; then
  echo "Set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD (Coolify SERVICE_USER_MINIO / SERVICE_PASSWORD_MINIO)." >&2
  exit 1
fi

docker exec -i "$MINIO_CONTAINER" mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
docker exec -i "$MINIO_CONTAINER" mc mb local/sru-chat --ignore-existing
docker exec -i "$MINIO_CONTAINER" mc anonymous set none local/sru-chat
echo "Bucket sru-chat ready on container $MINIO_CONTAINER"
