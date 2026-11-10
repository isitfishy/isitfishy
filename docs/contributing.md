# Contributing

Thanks for helping. Bug reports, wrong results and translation fixes are as welcome as code.
The full guide is
[CONTRIBUTING.md](https://github.com/isitfishy/isitfishy/blob/main/CONTRIBUTING.md).

## Reporting a wrong result

Use the issue templates:

- **False positive**: a legitimate link or message was shown as risky.
- **Missed scam**: a scam was shown as low risk or not verified.

Remove anything personal first. Paste the link without its query string, and replace names,
phone numbers and codes in a message with placeholders.

## Development setup

The repository is a [pnpm](https://pnpm.io/) workspace: `apps/api`, `apps/mobile` and
`packages/api-client`.

```bash
git clone https://github.com/isitfishy/isitfishy && cd isitfishy
pnpm install
docker compose up --build              # PostgreSQL, API and stub scorer
```

`pnpm --filter @isitfishy/api build` generates the Prisma client before compiling. The tests
need it too, so generate it once after `pnpm install`, as below.

Tests:

```bash
# API: unit and end-to-end tests, Node 26 and PostgreSQL
docker compose up -d db
(
  cd apps/api
  export DATABASE_URL=postgresql://isitfishy:isitfishy@localhost:5432/isitfishy
  pnpm exec prisma generate && pnpm exec prisma migrate deploy
  pnpm test && pnpm test:e2e
)

# App, Node 22
(cd apps/mobile && pnpm typecheck && pnpm test)

# Client
(cd packages/api-client && pnpm typecheck && pnpm test)

# Stub scorer
(cd tools/stub-scorer && node --test)
```

## Pull requests

- one change per pull request, with tests
- commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(mobile): ...`, `fix(api): ...`, `docs: ...`)
- regenerate the API client after changing an endpoint
- add a line to `CHANGELOG.md` under *Unreleased*

## Releases

A tag `vX.Y.Z` that matches `appVersion` in the Helm chart publishes the stub scorer image
`ghcr.io/isitfishy/isitfishy-stub-scorer:X.Y.Z` (and `:latest`). See
[CONTRIBUTING.md](https://github.com/isitfishy/isitfishy/blob/main/CONTRIBUTING.md#releases).

## Security

Please report vulnerabilities privately, through
[GitHub's private vulnerability reporting](https://github.com/isitfishy/isitfishy/security/advisories/new).
