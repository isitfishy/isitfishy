# Contributing

Thanks for helping. Bug reports, wrong results and translation fixes are as welcome as code.

## Reporting a wrong result

Use the issue templates: **False positive** when a legitimate link or message was shown as
risky, **Missed scam** when a scam was shown as low risk or not verified.

Remove anything personal before you post. Paste the link without its query string (the part
after `?`), and replace names, phone numbers, tracking numbers and codes in a message with
placeholders. A screenshot of the result screen helps.

## Development setup

The repository is a [pnpm](https://pnpm.io/) workspace:

| Path | What | Node |
| --- | --- | --- |
| `apps/api` | NestJS API with Prisma and PostgreSQL | 26 |
| `apps/mobile` | Expo / React Native app | 22 |
| `packages/api-client` | Typed client generated from the API's OpenAPI document | 22 |
| `tools/stub-scorer` | Minimal scoring service for local runs and tests | |

The pnpm version is pinned in `package.json`; `corepack enable` picks it up.

```bash
git clone https://github.com/isitfishy/isitfishy && cd isitfishy
pnpm install
docker compose up --build              # PostgreSQL, API and stub scorer
pnpm --filter @isitfishy/mobile start  # the app, with Expo
```

`pnpm --filter @isitfishy/api build` generates the Prisma client before compiling. The API
tests need the client as well; the block below generates it.

## Tests

```bash
# API: unit and end-to-end tests, needs PostgreSQL
docker compose up -d db
(
  cd apps/api
  export DATABASE_URL=postgresql://isitfishy:isitfishy@localhost:5432/isitfishy
  pnpm exec prisma generate && pnpm exec prisma migrate deploy
  pnpm exec eslint "{src,test}/**/*.ts"
  pnpm test && pnpm test:e2e
)

# App
(cd apps/mobile && pnpm typecheck && pnpm test)

# Client
(cd packages/api-client && pnpm typecheck && pnpm test)
```

CI runs the same commands, plus Maestro end-to-end flows on an Android emulator (see
[the mobile docs](docs/mobile.md)).

After changing an API endpoint, regenerate the client. CI fails if it is out of date:

```bash
pnpm --filter @isitfishy/api openapi
pnpm --filter @isitfishy/api-client generate
```

## Translations

Every text the app shows exists in Turkish, English, German, Spanish, French and Italian
(`apps/mobile/src/i18n.ts`). A change that adds or edits a text must cover all six. If you
only speak some of them, say so in the pull request and someone will fill in the rest.

## Docs

The site is built with [Zensical](https://zensical.org/) from `docs/` and `zensical.toml`:

```bash
uvx zensical@0.0.74 serve      # preview at http://localhost:8000
uvx zensical@0.0.74 build --strict
```

## Pull requests

- one change per pull request, with tests
- commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat(mobile): ...`, `fix(api): ...`, `docs: ...`, `chore(deps): ...`
- no real phone numbers, personal links or message text in tests and fixtures
- add a line to `CHANGELOG.md` under *Unreleased* for anything a user or operator notices

## Releases

1. Set `version` and `appVersion` in `deploy/helm/isitfishy/Chart.yaml` to the new version
   and move the *Unreleased* entries in `CHANGELOG.md` under it.
2. Push a tag `vX.Y.Z` that equals `appVersion`. The `stub-scorer-image` workflow builds
   `tools/stub-scorer`, smoke-tests it and pushes `ghcr.io/isitfishy/isitfishy-stub-scorer:X.Y.Z`
   and `:latest`. It fails without pushing if the tag and `appVersion` differ, because the
   chart pulls the `appVersion` tag by default.
3. Publish a GitHub release for the tag. Once `PUBLIC_API_URL` is set, the `release`
   workflow attaches an Android APK to it.

The first release is `v0.1.0`, the chart's current `appVersion`. A package pushed to GitHub
Container Registry for the first time is private: make it public in the package settings
once, so clusters can pull it without credentials.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
