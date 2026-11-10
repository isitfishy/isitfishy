# Self-hosting

You can run the whole stack yourself: on a laptop with Docker Compose, or on a server with
the Helm chart. Both start with the [stub scorer](scoring-contract.md#the-stub-scorer),
which returns well-formed answers but does not judge anything. Swap in a scorer of your own
to get real results.

## Docker Compose

Requirements: Docker with the Compose plugin.

```bash
git clone https://github.com/isitfishy/isitfishy && cd isitfishy
docker compose up --build
```

This starts three containers:

| Service | Port | What |
| --- | --- | --- |
| `db` | 5432 | PostgreSQL 17, user, password and database all `isitfishy` |
| `scorer` | 8000 | The stub scorer from `tools/stub-scorer` |
| `api` | 3000 | The API, which applies database migrations when it starts |

Check that it works:

```bash
curl -s localhost:3000/healthz
curl -s localhost:3000/v1/check -H 'content-type: application/json' \
  -d '{"input": "https://example.com"}'
```

Then point the [mobile app](mobile.md) at `http://<your machine>:3000`.

To use your own scorer, change the `scorer` service in `docker-compose.yml` to build or pull
your image, or drop it and set `SCORER_URL` on the `api` service to where your scorer
listens.

## Helm chart

The chart in `deploy/helm/isitfishy` runs the API, the scorer and PostgreSQL. It has been
used on a single-node [k3s](https://k3s.io/) cluster with `local-path` volumes and the
bundled Traefik ingress. Every pod runs as non-root with resource limits and startup,
readiness and liveness probes.

The API image is not published, so build it yourself and make it available to the cluster.
On k3s you can import it straight into its image store:

```bash
docker build -t isitfishy-api:dev -f apps/api/Dockerfile .
docker save isitfishy-api:dev | sudo k3s ctr images import -
```

With a registry, push it there and set `images.api` to match.

The chart has no default scorer image. Set `scorer.image.repository` on every install and
upgrade: `ghcr.io/isitfishy/isitfishy-stub-scorer` for the stub scorer, which each release
publishes, or your own scorer image. Without it the chart refuses to install. Then create
the database password and install:

```bash
kubectl create namespace isitfishy
openssl rand -hex 32 | tr -d '\n' \
  | kubectl -n isitfishy create secret generic isitfishy-postgres --from-file=password=/dev/stdin
helm upgrade --install isitfishy deploy/helm/isitfishy -n isitfishy \
  --set scorer.image.repository=ghcr.io/isitfishy/isitfishy-stub-scorer
```

With `scorer.image.tag` left empty the chart pulls the tag that matches its `appVersion`.
To use a stub built from your checkout instead, build it with
`docker build -t isitfishy-stub-scorer:dev tools/stub-scorer`, import it like the API image
and set `scorer.image.repository=isitfishy-stub-scorer` and `scorer.image.tag=dev`.

Secrets are created outside the chart. Piping them straight into `kubectl` keeps them off
the screen and out of shell history.

| Secret | Key | Used by | Required |
| --- | --- | --- | --- |
| `isitfishy-postgres` | `password` | PostgreSQL, API, backups | yes |
| `isitfishy-admin` | `token` | API review routes | no |

Without `isitfishy-admin` the review routes under `/v1/admin` answer 503; the review page at
`/admin` still loads, but every action on it fails. Pods read secrets when they start, so
restart a deployment after creating or rotating one.

Settings you are most likely to change, in `values.yaml`:

| Value | Default | What |
| --- | --- | --- |
| `images.api` | `isitfishy-api:dev` | API image |
| `scorer.image.repository`, `scorer.image.tag` | none (required), `""` (the chart's `appVersion`) | Scorer image: `ghcr.io/isitfishy/isitfishy-stub-scorer` or your own scorer |
| `scorer.port`, `scorer.env`, `scorer.existingSecret` | `8000`, none, none | Port and settings for your scorer; see `deploy/README.md` |
| `api.scorerTimeoutMs` | `75000` | How long the API waits for the scorer |
| `admin.tokenSecret` | `isitfishy-admin` | Secret for the review routes; `""` leaves them unwired |
| `postgres.size` | `5Gi` | Database volume |
| `backup.schedule`, `backup.keep` | `30 2 * * *`, `7` | Daily `pg_dump` and how many dumps to keep |
| `ingress.enabled`, `ingress.className`, `ingress.host` | `true`, `traefik`, `""` (any host) | Ingress for the API |

The chart has no TLS settings: the ingress uses Traefik's plain HTTP `web` entrypoint.
The mobile app needs an `https` API, so terminate TLS in front of the chart, for example
with a tunnel, a reverse proxy or your own Traefik TLS configuration.

`deploy/README.md` covers rotating secrets, backups and restores in detail.

### Real client addresses

The API rate-limits per client address. On k3s the bundled Traefik service rewrites the
source address by default, so every client would share one limit. Apply
`deploy/traefik-config.yaml` once to keep the real address:

```bash
sudo k3s kubectl apply -f deploy/traefik-config.yaml
```

## API configuration

The API reads these environment variables:

| Variable | Default | What |
| --- | --- | --- |
| `DATABASE_URL` | none, required | PostgreSQL connection string |
| `SCORER_URL` | `http://localhost:8000` | Base URL of the scoring service; the API calls `SCORER_URL/v1/check` |
| `SCORER_TIMEOUT_MS` | `75000` | Time to wait for the scorer before answering 503 |
| `ADMIN_TOKEN` | unset | Bearer token for `/v1/admin/*`, which the review page at `/admin` calls; unset makes those routes answer 503 |
| `ENABLE_DOCS` | unset | `1` serves Swagger UI at `/docs` |
| `TRUST_PROXY_HOPS` | `1` | Number of proxies in front of the API that add to `X-Forwarded-For` |
| `PORT` | `3000` | Listening port |

Set `TRUST_PROXY_HOPS` to the real number of proxies. Too low and every client shares the
proxy's rate limit; too high and a client can pick its own address by faking the header.
Use `0` when clients connect to the API directly.
