{{- define "sru-meeting.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "sru-meeting.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "sru-meeting.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "sru-meeting.labels" -}}
app.kubernetes.io/name: {{ include "sru-meeting.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "sru-meeting.web.fullname" -}}
{{ include "sru-meeting.fullname" . }}-web
{{- end -}}

{{- define "sru-meeting.postgres.fullname" -}}
{{ include "sru-meeting.fullname" . }}-postgres
{{- end -}}

{{- define "sru-meeting.redis.fullname" -}}
{{ include "sru-meeting.fullname" . }}-redis
{{- end -}}

{{- define "sru-meeting.minio.fullname" -}}
{{ include "sru-meeting.fullname" . }}-minio
{{- end -}}

{{- define "sru-meeting.secretName" -}}
{{- if .Values.web.secrets.existingSecret -}}
{{- .Values.web.secrets.existingSecret -}}
{{- else -}}
{{ include "sru-meeting.fullname" . }}-secrets
{{- end -}}
{{- end -}}
