#!/usr/bin/env bash
# Save container images for air-gapped installs.
# Dry-run by default (lists images only). Pass --execute to docker pull + save.
#
# Usage:
#   ./infra/scripts/save-images.sh
#   ./infra/scripts/save-images.sh --execute
#   ./infra/scripts/save-images.sh --execute --out /path/to/dir
set -euo pipefail

EXECUTE=0
OUT_DIR="${SRU_IMAGE_OUT:-./airgap-images}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)
      EXECUTE=1
      shift
      ;;
    --out)
      OUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
save-images.sh — list (default) or pull+save images for air-gapped SRU-Meeting installs.

  --execute   Actually docker pull and docker save (default is dry-run)
  --out DIR   Output directory for .tar files (default: ./airgap-images)
  -h, --help  Show this help

Images covered: LiveKit SFU, egress, coturn, web, Postgres, Redis, MinIO.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1 (try --help)" >&2
      exit 1
      ;;
  esac
done

# Keep tags aligned with infra/docker-compose.yml and Helm values.
IMAGES=(
  "livekit/livekit-server:v1.13.6"
  "livekit/egress:v1.10.0"
  "coturn/coturn:4.17"
  "sru-meeting/web:latest"
  "postgres:16-alpine"
  "redis:7-alpine"
  "minio/minio:latest"
)

echo "SRU-Meeting air-gap image list (${#IMAGES[@]} images)"
echo "Mode: $([[ "$EXECUTE" -eq 1 ]] && echo execute || echo dry-run)"
echo

for image in "${IMAGES[@]}"; do
  echo "  - ${image}"
done

if [[ "$EXECUTE" -ne 1 ]]; then
  echo
  echo "Dry-run only — no docker pull/save. Re-run with --execute to write tarballs to ${OUT_DIR}"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for --execute" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

for image in "${IMAGES[@]}"; do
  safe_name=$(echo "${image}" | tr '/:' '__')
  tar_path="${OUT_DIR}/${safe_name}.tar"
  echo "Pulling ${image}…"
  docker pull "${image}"
  echo "Saving ${tar_path}…"
  docker save -o "${tar_path}" "${image}"
done

echo "Done. Load on the air-gapped host with: docker load -i <file.tar>"
