# Helm: sru-conf (web + data stores)

Kubernetes chart for the **web** app plus **Postgres**, **Redis**, and **MinIO**.

**Docker Compose is still the local / small-org default.** Use `infra/docker-compose.yml` for day-to-day development. This chart is the production-oriented path; it does not replace Compose.

LiveKit SFU, coturn, and egress values live under `infra/helm/` (see `infra/README.md`). This chart stays app + data stores only.

## Render (no cluster required)

```powershell
helm template sru infra/helm/sru-conf
```

Or from this directory:

```powershell
helm template sru .
```

## Install (after replacing placeholders)

`values.yaml` uses `REPLACE_ME` only — never commit real secrets.

```powershell
helm upgrade --install sru infra/helm/sru-conf `
  --set postgres.auth.password=$env:POSTGRES_PASSWORD `
  --set minio.auth.rootUser=$env:MINIO_ROOT_USER `
  --set minio.auth.rootPassword=$env:MINIO_ROOT_PASSWORD `
  --set web.secrets.authSecret=$env:AUTH_SECRET `
  --set web.secrets.livekitApiKey=$env:LIVEKIT_API_KEY `
  --set web.secrets.livekitApiSecret=$env:LIVEKIT_API_SECRET `
  --set web.secrets.s3AccessKey=$env:S3_ACCESS_KEY `
  --set web.secrets.s3SecretKey=$env:S3_SECRET_KEY `
  --set web.secrets.internalCronSecret=$env:INTERNAL_CRON_SECRET `
  --set web.env.S3_ENDPOINT="http://sru-sru-conf-minio:9000" `
  --set web.env.S3_INTERNAL_ENDPOINT="http://sru-sru-conf-minio:9000"
```

Prefer `web.secrets.existingSecret` pointing at a sealed/external Secret in production.
