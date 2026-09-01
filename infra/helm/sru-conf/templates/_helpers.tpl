{{- define "sru-conf.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "sru-conf.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "sru-conf.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "sru-conf.labels" -}}
app.kubernetes.io/name: {{ include "sru-conf.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "sru-conf.web.fullname" -}}
{{ include "sru-conf.fullname" . }}-web
{{- end -}}

{{- define "sru-conf.postgres.fullname" -}}
{{ include "sru-conf.fullname" . }}-postgres
{{- end -}}

{{- define "sru-conf.redis.fullname" -}}
{{ include "sru-conf.fullname" . }}-redis
{{- end -}}

{{- define "sru-conf.minio.fullname" -}}
{{ include "sru-conf.fullname" . }}-minio
{{- end -}}

{{- define "sru-conf.secretName" -}}
{{- if .Values.web.secrets.existingSecret -}}
{{- .Values.web.secrets.existingSecret -}}
{{- else -}}
{{ include "sru-conf.fullname" . }}-secrets
{{- end -}}
{{- end -}}
