# stub-scorer

A stand-in for the scorer service, so the API and the mobile app can run end to end without
it. It speaks the same HTTP contract the API expects (`apps/api/src/scorer/scorer.types.ts`),
but **it does not analyse anything**: every answer comes from [`fixtures.json`](fixtures.json).
Use it for local development, CI and demos, never to judge real links.

No dependencies; Node 22 or newer.

```sh
node server.js            # listens on 0.0.0.0:8000 (PORT, HOST and FIXTURES override)
node --test               # tests
docker build -t stub-scorer .
```

## Endpoints

- `GET /healthz` returns `{"status":"ok"}`.
- `POST /v1/check` takes `{"input": "<text>"}` and returns `{"public": CheckResult, "report": ReportFacts | null}`.

## Demo answers

The first link in the input is taken (a URL, or else a bare host name) and its host is
compared with the fixtures. A fixture matches its domain and every subdomain of it.

| Host | Verdict |
| --- | --- |
| `example-scam.test` and subdomains | high, one `evidence` reason |
| `example-suspicious.test` and subdomains | medium, one `warning` reason |
| `example.com` and subdomains | low, one `reassurance` reason |
| anything else | low and `unverified`, "the demo scorer cannot judge this link" |
| no link in the input | low and `unverified`, `report` is `null` |

```sh
curl -s localhost:8000/v1/check -H 'content-type: application/json' \
  -d '{"input":"Your parcel is waiting: https://parcel.example-scam.test/track"}'
```

Reasons carry a message in every app language (`tr`, `en`, `de`, `es`, `fr`, `it`). To add a
case, add an entry to `domains` in `fixtures.json`; the tests check that every message is
translated.
