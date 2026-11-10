# Changelog

All notable changes to this project are listed here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

First public release of the source code. The scoring service stays private; this
repository includes a stub scorer for development.

### App

- Check a pasted SMS or link, a scanned QR code, or text shared to the app from SMS, a
  browser or a chat app.
- Results as a risk band, low, medium or high, with a one-line summary and the reasons
  behind it in plain language.
- "Not verified" instead of "Low risk" when nothing suspicious was found but nothing speaks
  for the link either.
- Shows the real address a link leads to, and a picture of the page without opening it.
- Open the checked link from the result. Risky and unverified links ask for confirmation
  first and remind you not to enter passwords, card details or codes.
- Stop screen for risky links, and an "I clicked it, what now?" guide.
- Send a warning to family with the summary and a defanged link, never the message.
- Report a link as a scam, or tell us a warning was wrong.
- Recent checks kept only on the phone, and a privacy summary in the app.
- Six languages (Turkish, English, German, Spanish, French, Italian), system, light and
  dark themes, and a large text mode.

### API

- `POST /v1/check`, `POST /v1/reports` (scam reports and disputed warnings, stored without
  the query string) and `GET /v1/reports/trending`.
- OpenAPI document and a typed TypeScript client, with a CI check for drift. API
  documentation is served only when `ENABLE_DOCS=1`.
- Per-client rate limiting and a token-guarded review page for reports.

### Infrastructure

- Docker Compose setup for local development.
- Helm chart for k3s with non-root pods, probes, resource limits and daily database
  backups. The scorer image is a required setting (`scorer.image.repository`), so the chart
  never picks a scorer on its own.
- The stub scorer image is published to `ghcr.io/isitfishy/isitfishy-stub-scorer` for every
  `vX.Y.Z` tag, as `X.Y.Z` and `latest`; the tag must match the chart's `appVersion`, which
  is the image tag the chart pulls by default. See *Releases* in `CONTRIBUTING.md`.
- CI for the API and the app, including Maestro end-to-end flows on an Android emulator,
  and weekly dependency and security checks.
