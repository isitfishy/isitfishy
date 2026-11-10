{{- define "isitfishy.labels" -}}
app.kubernetes.io/part-of: isitfishy
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "isitfishy.podSecurity" -}}
automountServiceAccountToken: false
securityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
{{- end }}

{{- define "isitfishy.containerSecurity" -}}
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]
{{- end }}

{{- /*
The scorer image has no default on purpose: a release must say which scorer it runs, so a
missing values file fails the install instead of quietly running something else.
*/}}
{{- define "isitfishy.scorerImage" -}}
{{- $repository := required "scorer.image.repository is required: set it to ghcr.io/isitfishy/isitfishy-stub-scorer for the stub scorer, or to your own scorer image (see deploy/README.md)" .Values.scorer.image.repository -}}
{{ $repository }}:{{ .Values.scorer.image.tag | default .Chart.AppVersion }}
{{- end }}
