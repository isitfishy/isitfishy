# Security policy

## Reporting a vulnerability

Please report security problems in IsItFishy privately through
[GitHub's private vulnerability reporting](https://github.com/isitfishy/isitfishy/security/advisories/new),
not in a public issue. Include the component (app, API, Helm chart), the version or commit,
and the steps that show the problem. You should get an answer within a week.

Things that count as a vulnerability here:

- the API storing or logging the text of a check, or storing a report with its query string
  or fragment
- a way around the per-client rate limits, for example by faking `X-Forwarded-For`
- reaching `/v1/admin/*` or the review page without the admin token
- input that makes the API crash, hang or run code
- the app sending data anywhere other than the API it is configured for, or leaking check
  history to other apps
- the Helm chart running a pod as root, exposing PostgreSQL outside the cluster, or putting
  a secret where it can be read without access to the namespace

## Wrong results are not vulnerabilities

A scam that is shown as low risk, or a legitimate link shown as risky, is an accuracy
problem, not a security vulnerability. Please use the **Missed scam** or **False positive**
issue templates. Do not send details of how a result could be influenced in a public issue;
use private reporting for that instead.

## Supported versions

Only the latest release and the `main` branch get fixes.

## Handling of reports

The API keeps the links users report, without query strings, so that reviewers can confirm
them. If you run your own instance, treat its database as personal data: keep the
`isitfishy-postgres` and `isitfishy-admin` secrets in the cluster only, and restrict who
can read the backup volume.
