# Scoring service contract

The API does not score anything itself. It hands every check to a scoring service over one
HTTP endpoint. Anything that implements this endpoint can be plugged in, in any language.

## Request

```http
POST {SCORER_URL}/v1/check
Content-Type: application/json

{"input": "PTT: Your parcel is waiting: example.com/track"}
```

`input` is what the user checked: a link, the content of a QR code or the text of a
message, at most 4000 characters. The API also calls this endpoint with a single link,
without its query string, when someone files a report.

The API waits `SCORER_TIMEOUT_MS` (75 seconds by default). A timeout, a connection error or
any status other than 2xx makes the API answer `503` to the app.

## Response

```json
{
  "public": {
    "verdict": "medium",
    "unverified": false,
    "link": "https://example.com/track",
    "destination": null,
    "preview": null,
    "reasons": [
      {
        "group": "warning",
        "message": {
          "tr": "...",
          "en": "...",
          "de": "...",
          "es": "...",
          "fr": "...",
          "it": "..."
        }
      }
    ]
  },
  "report": {
    "host": "example.com",
    "registered_domain": "example.com",
    "score": 42
  }
}
```

### `public`: CheckResult { #checkresult }

Returned to the app as is.

| Field | Type | Meaning |
| --- | --- | --- |
| `verdict` | `"low"`, `"medium"` or `"high"` | The risk band |
| `unverified` | boolean | `true` when the verdict is low but nothing speaks for the link; the app then shows **Not verified** instead of **Low risk** |
| `link` | string or null | The link the verdict is about, if the input held one |
| `destination` | string or null | Where the link leads, when that is known and differs from `link` |
| `preview` | string or null | A base64 JPEG picture of the page, if your scorer makes one; the app shows it on the result screen |
| `reasons` | array | The reasons shown under the verdict, in order |

Each reason has a `group` and a `message`:

| `group` | Shown as |
| --- | --- |
| `evidence` | Hard evidence |
| `warning` | Warning signs |
| `reassurance` | What lowers the risk |

`message` maps a language code to the text in that language. Provide all six languages the
app supports: `tr`, `en`, `de`, `es`, `fr` and `it`. Keep each message to one or two short
sentences; the app shows it as written.

### `report`: what a report stores

`null` when the input holds no link. Otherwise:

| Field | Type | Meaning |
| --- | --- | --- |
| `host` | string | Host name of the link |
| `registered_domain` | string | The registrable domain, used to group reports into trends |
| `score` | number | Stored with the report for your own use; the API does not interpret it |

The API never returns `report` to the app. When a report is filed and `report` is `null`,
the API answers `400 Not a valid link`.

## The stub scorer

`tools/stub-scorer` is a minimal scorer that implements this contract and nothing else. It
answers every check with a well-formed result that does not judge the input, so the app,
the API and reports can be run and tested end to end. It is what Docker Compose and the
Helm chart run by default, and a starting point for your own; its README says exactly what
it returns.

To write your own, copy the stub, keep the response shape, and make sure that:

- every reason has a message in all six languages;
- the endpoint answers well within `SCORER_TIMEOUT_MS`, or raise the timeout;
- the input is not stored or logged, since it can be a personal message (see
  [Privacy](privacy.md)).

The OpenAPI document of the API (`packages/api-client/openapi.json`) has the
`CheckResult` schema in machine-readable form, and
`apps/api/src/scorer/scorer.types.ts` has the TypeScript types the API uses.
