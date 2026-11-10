# API

The API in `apps/api` is a NestJS service. All request and response bodies are JSON.

## Endpoints

| Method and path | What | Rate limit per client |
| --- | --- | --- |
| `POST /v1/check` | Check a link, QR payload or SMS text | 20 a minute |
| `POST /v1/reports` | Report a link as a scam, or say a warning was wrong | 10 a minute |
| `GET /v1/reports/trending` | Most reported domains in the last 7 days | 120 a minute |
| `GET /healthz` | Liveness check, answers `{"status": "ok"}` | none |
| `GET /v1/admin/...` | Review queue for reports | needs `ADMIN_TOKEN` |
| `GET /admin` | Review page; its actions call `/v1/admin/...` | none to load |

A client over its limit gets `429`. When the scoring service cannot be reached or fails,
`/v1/check` and `/v1/reports` answer `503`.

### Check

```bash
curl -s https://api.example.org/v1/check -H 'content-type: application/json' \
  -d '{"input": "Your parcel is waiting: example.com/track"}'
```

`input` is 1 to 4000 characters: a link, the content of a QR code or the text of a message.
It is checked in memory and never stored. The answer is a `CheckResult`:

```json
{
  "verdict": "low",
  "unverified": true,
  "link": "https://example.com/track",
  "destination": null,
  "preview": null,
  "reasons": [
    {
      "group": "warning",
      "message": { "en": "...", "tr": "...", "de": "...", "es": "...", "fr": "...", "it": "..." }
    }
  ]
}
```

The fields are described in the [scoring service contract](scoring-contract.md#checkresult),
since the API passes them through from the scorer.

### Reports

```bash
curl -s https://api.example.org/v1/reports -H 'content-type: application/json' \
  -d '{"url": "https://example.com/track?id=123", "category": "CARGO", "kind": "SCAM"}'
```

| Field | Values | Default |
| --- | --- | --- |
| `url` | the link only, 4 to 2048 characters | required |
| `category` | `CARGO`, `BANK`, `GOVERNMENT`, `TELECOM`, `OTHER` | `OTHER` |
| `kind` | `SCAM`, or `NOT_SCAM` to dispute a warning the app showed | `SCAM` |

The query string and fragment are removed before anything is stored, because they often
carry tokens that identify the person who received the message. `url` must be the link
alone: the API answers `400` when it is missing or outside 4 to 2048 characters, when it
does not parse as an address (a link with text around it does not), and when the scorer
finds no link in it. Nothing is stored then. Otherwise the answer is `201` with the new
report's `id` and `createdAt`.

`GET /v1/reports/trending` returns up to 20 `{registeredDomain, reports}` entries. Disputed
warnings and reports a reviewer rejected are not counted.

### Review

Requests to `/v1/admin/*` need `Authorization: Bearer <ADMIN_TOKEN>`; a wrong or missing
token answers `401`, and without `ADMIN_TOKEN` on the server they answer `503`. `GET /admin`
serves a small page for going through reports and marking them confirmed or rejected. The
page itself loads without a token and asks for one; everything it does goes through
`/v1/admin/*`.

## OpenAPI document

The OpenAPI document is committed at
[`packages/api-client/openapi.json`](https://github.com/isitfishy/isitfishy/blob/main/packages/api-client/openapi.json)
and is the source of the typed client. After changing an endpoint, regenerate both; CI
fails if they are out of date:

```bash
pnpm --filter @isitfishy/api openapi
pnpm --filter @isitfishy/api-client generate
```

## Swagger UI

Interactive documentation is off by default. Start the API with `ENABLE_DOCS=1` to serve
Swagger UI at `/docs`:

```bash
cd apps/api
ENABLE_DOCS=1 pnpm start:dev
```

## Running the tests

The API needs Node 26 and a PostgreSQL database for its end-to-end tests:

```bash
docker compose up -d db
cd apps/api
export DATABASE_URL=postgresql://isitfishy:isitfishy@localhost:5432/isitfishy
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm test && pnpm test:e2e
```
