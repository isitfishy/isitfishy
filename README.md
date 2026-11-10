# IsItFishy

[![api](https://github.com/isitfishy/isitfishy/actions/workflows/api.yml/badge.svg)](https://github.com/isitfishy/isitfishy/actions/workflows/api.yml)
[![mobile](https://github.com/isitfishy/isitfishy/actions/workflows/mobile.yml/badge.svg)](https://github.com/isitfishy/isitfishy/actions/workflows/mobile.yml)
![License](https://img.shields.io/badge/license-MIT-green)

Scam checker for links, QR codes and SMS messages. Paste a message, share a link or scan a
QR code and get a risk band with a plain-language explanation, in six languages.

The app, API and infrastructure are in this repository. The scoring service that decides
the risk band is a separate, private component and deliberately not documented, so scammers
cannot tune their sites against it. This repository ships a stub scorer with the same HTTP
contract, so everything here runs and can be developed without it.

Documentation: <https://isitfishy.github.io/isitfishy/>

> **Status:** early development. Not yet published in any app store.

<table>
  <tr>
    <td width="33%"><img src="docs/images/high-tr.png" alt="Fake cargo SMS in Turkish with a high risk result"></td>
    <td width="33%"><img src="docs/images/high-en.png" alt="Fake delivery fee SMS in English with a high risk result"></td>
    <td width="33%"><img src="docs/images/low-tr.png" alt="Official e-Devlet link in Turkish with a low risk result"></td>
  </tr>
  <tr>
    <td align="center">Fake cargo SMS (TR)</td>
    <td align="center">Fake delivery fee (EN)</td>
    <td align="center">Official e-Devlet link</td>
  </tr>
</table>

Screenshots show the hosted service. The stub scorer in this repository returns demo results
instead.

## Architecture

```mermaid
flowchart LR
  App[Mobile app<br/>Expo + TypeScript] -->|HTTPS| API[API<br/>NestJS]
  API --> Scoring[Private scoring service]
  API --> DB[(PostgreSQL<br/>reported links only)]
```

A result is a risk band, **low**, **medium** or **high**, with its reasons in plain language.
Low means no strong warning signs were found, not that a link is safe. When nothing speaks
for a link the app says **Not verified** instead of calling it low risk.

## Results

Headline rates of the scoring service behind the public app. See
[docs/results.md](docs/results.md).

| Sample | Result |
| --- | --- |
| Recent scam links, first sample (143) | 75.5% flagged |
| Recent scam links, second sample (301) | 35.9% flagged |
| Ordinary sites (400) | 1 flagged |

## Engineering

- Typed TypeScript client generated from the API's OpenAPI document, with a CI check for drift
- Maestro end-to-end flows on an Android emulator in CI
- Helm chart on k3s: non-root pods, probes, resource limits, daily database backups
- Per-client rate limiting behind Traefik, and a token-guarded review queue for reports
- Reports stored without query strings; message text never written anywhere
- Six languages, system, light and dark themes, large text mode
- Weekly dependency and security checks

## Repository layout

| Path | What |
| --- | --- |
| `apps/mobile` | Expo / React Native app (TypeScript) |
| `apps/api` | NestJS API with Prisma and PostgreSQL |
| `packages/api-client` | Typed TypeScript client generated from the API's OpenAPI document |
| `deploy` | Helm chart and deployment notes |

## Running locally

Requirements: Node 26 for the API, Node 22 for the app, pnpm, Docker.

```bash
pnpm install
docker compose up --build
pnpm --filter @isitfishy/mobile start
```

Scan the QR code with Expo Go. In development the app calls the API on the machine running
Expo, so a phone on the same Wi-Fi works without setup; set `EXPO_PUBLIC_API_URL` to use
another API.

After changing an API endpoint, regenerate the client; CI fails if it is out of date:

```bash
pnpm --filter @isitfishy/api openapi
pnpm --filter @isitfishy/api-client generate
```

## Tests

```bash
# API: unit and end-to-end tests, needs Node 26 and PostgreSQL (docker compose up -d db)
(
  cd apps/api
  export DATABASE_URL=postgresql://isitfishy:isitfishy@localhost:5432/isitfishy
  pnpm exec prisma generate && pnpm exec prisma migrate deploy
  pnpm test && pnpm test:e2e
)

# App
(cd apps/mobile && pnpm typecheck && pnpm test)

# Client
(cd packages/api-client && pnpm typecheck && pnpm test)

# Stub scorer
(cd tools/stub-scorer && node --test)
```

[CONTRIBUTING.md](CONTRIBUTING.md) has the full development setup.

## Privacy

Message text is checked in memory and never stored. A report keeps only the link, with its
query string removed. See [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE)
