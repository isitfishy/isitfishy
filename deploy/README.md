# Deployment

The Helm chart in `helm/isitfishy` runs the API, a scorer and PostgreSQL on a single-node k3s
cluster with `local-path` volumes. Commands below assume the `isitfishy` namespace and a
release called `isitfishy`.

The API image is not published. Build it under the name the chart expects and import it
into k3s (or push it to a registry and set `images.api`). The chart has no default scorer
image: every install and upgrade must set `scorer.image.repository`, otherwise the chart
stops with an error instead of picking a scorer for you. For the stub scorer, use the image
each release publishes:

```bash
docker build -t isitfishy-api:dev -f apps/api/Dockerfile .
docker save isitfishy-api:dev | sudo k3s ctr images import -
helm upgrade --install isitfishy deploy/helm/isitfishy -n isitfishy --reset-then-reuse-values \
  --set scorer.image.repository=ghcr.io/isitfishy/isitfishy-stub-scorer
```

With `scorer.image.tag` left empty the chart pulls the tag that matches its `appVersion`.
To run the stub from your checkout instead, build it with
`docker build -t isitfishy-stub-scorer:dev tools/stub-scorer`, import it the same way and set
`scorer.image.repository=isitfishy-stub-scorer` and `scorer.image.tag=dev`.

The PostgreSQL password secret must exist first (see [Secrets](#secrets)).

`--reset-then-reuse-values` keeps the values set at install time and still picks up new
defaults from the chart; plain `--reuse-values` would drop them.

## Scorer

The API does not judge links itself. It sends each check to a scorer service and passes the
answer on, so the scorer is a pluggable part: any HTTP service that implements the contract
below can be dropped in. The chart does not pick one for you: `scorer.image.repository` is
required. The stub scorer from `tools/stub-scorer` is published as
`ghcr.io/isitfishy/isitfishy-stub-scorer`; it answers with fixed results and is meant for
development and demos.

### Contract

The API reaches the scorer at `http://scorer:8000` (`SCORER_URL`) and gives up after
`api.scorerTimeoutMs` (`SCORER_TIMEOUT_MS`, 75 s by default).

`POST /v1/check` with a JSON body:

```json
{ "input": "the text or link the user pasted" }
```

answers `200` with:

```json
{
  "public": {
    "verdict": "low | medium | high",
    "unverified": false,
    "link": "https://example.com/login",
    "destination": "https://example.com/login",
    "preview": null,
    "reasons": [
      {
        "group": "evidence | warning | reassurance",
        "message": { "tr": "...", "en": "...", "de": "...", "es": "...", "fr": "...", "it": "..." }
      }
    ]
  },
  "report": { "host": "example.com", "registered_domain": "example.com", "score": 0 }
}
```

- `public` is returned to the app as it is. `unverified` is true when the verdict is `low`
  but nothing speaks for the link. `link`, `destination` and `preview` (a base64 JPEG) may be
  `null`.
- `report` is kept with user reports and never returned to clients. It may be `null`.
- A non-2xx status, a connection error or a timeout makes the API answer `503`.

`GET /healthz` must answer `200` once the scorer is ready; the startup, readiness and
liveness probes use it. The types live in `apps/api/src/scorer/scorer.types.ts`.

### Running another scorer

Everything about the scorer Deployment is set through `scorer.*` in `values.yaml`:

| Value | Purpose |
| --- | --- |
| `scorer.image.repository`, `.tag`, `.pullPolicy` | Image. `repository` is required (`ghcr.io/isitfishy/isitfishy-stub-scorer` for the stub); an empty tag falls back to the chart's `appVersion` |
| `scorer.port` | Port the container listens on (the Service stays on 8000) |
| `scorer.runAsUser`, `scorer.fsGroup` | Numeric user and group; the pod never runs as root |
| `scorer.env` | Extra environment variables, as a Kubernetes `EnvVar` list |
| `scorer.envFrom`, `scorer.existingSecret` | Load variables from config maps or secrets |
| `scorer.persistence.*` | Optional volume kept across restarts (off by default) |
| `scorer.initContainers`, `scorer.extraVolumes`, `scorer.extraVolumeMounts` | Passed through to the pod |
| `scorer.resources` | CPU and memory requests and limits |

Put your settings in a values file and pass it on every install and upgrade:

```bash
helm upgrade --install isitfishy deploy/helm/isitfishy -n isitfishy \
  --reset-then-reuse-values -f my-scorer.yaml
```

## Secrets

Secrets are created outside the chart. Generate them on the server and pipe them straight
into `kubectl`, so they never appear on screen or in shell history.

| Secret | Key | Used by | Required |
| --- | --- | --- | --- |
| `isitfishy-postgres` | `password` | PostgreSQL, API, backups | yes |
| `isitfishy-admin` | `token` | API admin routes | no |

A scorer that needs secrets of its own gets them through `scorer.env` (`valueFrom`),
`scorer.envFrom` or `scorer.existingSecret`.

```bash
openssl rand -hex 32 | tr -d '\n' \
  | kubectl -n isitfishy create secret generic isitfishy-admin --from-file=token=/dev/stdin
kubectl -n isitfishy rollout restart deploy/api
```

The admin token protects `/v1/admin/*`. Without the secret those routes answer 503. The review
page at `/admin` loads without a token; everything it does goes through those routes. Pods
read the secret when they start, hence the restart. To call an admin route yourself, read the
token into a variable instead of printing it:

```bash
ADMIN_TOKEN=$(kubectl -n isitfishy get secret isitfishy-admin -o jsonpath='{.data.token}' | base64 -d)
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" https://<api host>/v1/admin/reports | head
```

To rotate it, delete the secret, create it again as above and restart the deployments that
read it.

## Resources and probes

Every container has CPU and memory requests and limits (`*.resources` in `values.yaml`). The
API, scorer and PostgreSQL have a startup probe (up to five minutes for migrations, scorer
start-up or crash recovery), a readiness probe and a liveness probe.

## Client addresses and rate limits

The API limits requests per client address (`POST /v1/check` 20 a minute, `POST /v1/reports`
10 a minute). On k3s the bundled Traefik Service defaults to `externalTrafficPolicy:
Cluster`, which rewrites the source address, so every client would share one limit. Apply
`deploy/traefik-config.yaml` once to keep the real address:

```bash
sudo k3s kubectl apply -f deploy/traefik-config.yaml
```

If another proxy or tunnel is ever put in front of Traefik, raise `TRUST_PROXY_HOPS` on the
API to the number of proxies that add to `X-Forwarded-For`.

## Backups

The `postgres-backup` CronJob runs `pg_dump --format=custom` every day at 02:30 UTC
(`backup.schedule`) into the `postgres-backups` volume and keeps the last 7 dumps
(`backup.keep`), one file per day named `isitfishy-YYYY-MM-DD.dump`. Each dump is read back
with `pg_restore --list` before it replaces an older one. The volume is kept when the release
is uninstalled.

The backup volume sits on the same disk as the database, so it protects against mistakes and
a broken database, not against losing the machine. Copy dumps elsewhere now and then (see
below).

Take a backup now:

```bash
kubectl -n isitfishy create job --from=cronjob/postgres-backup backup-manual-$(date +%s)
kubectl -n isitfishy logs -f job/backup-manual-...
```

### Restore

1. Stop the API so nothing writes while the database is replaced:

   ```bash
   kubectl -n isitfishy scale deploy/api --replicas=0
   ```

2. Start a helper pod that mounts the backups:

   ```bash
   kubectl -n isitfishy apply -f - <<'EOF'
   apiVersion: v1
   kind: Pod
   metadata: { name: pg-restore }
   spec:
     automountServiceAccountToken: false
     securityContext: { runAsNonRoot: true, runAsUser: 70, fsGroup: 70 }
     containers:
       - name: restore
         image: postgres:17-alpine
         command: [sleep, "3600"]
         env:
           - { name: PGHOST, value: postgres }
           - { name: PGUSER, value: isitfishy }
           - name: PGPASSWORD
             valueFrom: { secretKeyRef: { name: isitfishy-postgres, key: password } }
         volumeMounts: [{ name: backups, mountPath: /backups }]
     volumes:
       - name: backups
         persistentVolumeClaim: { claimName: postgres-backups }
   EOF
   kubectl -n isitfishy wait --for=condition=Ready pod/pg-restore
   kubectl -n isitfishy exec pg-restore -- ls -lh /backups
   ```

3. Restore the chosen dump. `--clean --if-exists` drops the tables in the dump first and
   `--single-transaction` leaves the database untouched if anything fails. Tables created
   after the dump was taken are left alone:

   ```bash
   kubectl -n isitfishy exec pg-restore -- pg_restore --clean --if-exists --no-owner \
     --single-transaction -d isitfishy /backups/isitfishy-2026-11-05.dump
   ```

   If a Prisma migration ran after the dump was taken, its tables survive this while
   `_prisma_migrations` goes back, and the API then fails to apply the migration again. In
   that case empty the schema first and restore without `--clean`:

   ```bash
   kubectl -n isitfishy exec pg-restore -- psql -v ON_ERROR_STOP=1 -d isitfishy \
     -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
   kubectl -n isitfishy exec pg-restore -- pg_restore --no-owner --single-transaction \
     -d isitfishy /backups/isitfishy-2026-11-05.dump
   ```

4. Remove the helper and start the API again:

   ```bash
   kubectl -n isitfishy delete pod pg-restore
   kubectl -n isitfishy scale deploy/api --replicas=1
   ```

To copy a dump off the machine, use the same helper pod:
`kubectl -n isitfishy cp pg-restore:/backups/isitfishy-2026-11-05.dump ./isitfishy-2026-11-05.dump`.
To restore one from elsewhere, `kubectl cp` it into the helper pod's `/tmp` and point
`pg_restore` there.
