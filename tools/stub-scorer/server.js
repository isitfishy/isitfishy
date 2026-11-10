// A stand-in scorer for local development, CI and demos. It answers the same HTTP contract
// as the scorer the API talks to (see apps/api/src/scorer/scorer.types.ts), but every
// verdict comes from fixtures.json. It does not analyse links.

import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * @typedef {'low' | 'medium' | 'high'} Verdict
 * @typedef {'evidence' | 'warning' | 'reassurance'} ReasonGroup
 * @typedef {{ group: ReasonGroup, message: Record<string, string> }} Reason
 * @typedef {{
 *   verdict: Verdict, unverified: boolean, link: string | null,
 *   destination: string | null, preview: string | null, reasons: Reason[]
 * }} CheckResult
 * @typedef {{ host: string, registered_domain: string, score: number }} ReportFacts
 * @typedef {{ public: CheckResult, report: ReportFacts | null }} ScorerResponse
 * @typedef {{ verdict: Verdict, unverified: boolean, score?: number, reasons: Reason[] }} Outcome
 * @typedef {{ domains: (Outcome & { domain: string })[], unknown: Outcome, noLink: Outcome }} Fixtures
 */

/** Largest request body accepted, in bytes. */
export const MAX_BODY = 64 * 1024;

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/i;
const HOST_RE =
  /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\b(?::\d{1,5})?(?:\/[^\s<>"']*)?/i;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/**
 * Loads fixtures from a JSON file.
 * @param {string | URL} [path]
 * @returns {Fixtures}
 */
export function loadFixtures(path = new URL('./fixtures.json', import.meta.url)) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Finds the first link in free text: a URL with a scheme, or else a bare host name.
 * @param {string} text
 * @returns {{ link: string, host: string } | null}
 */
export function extractLink(text) {
  const match = text.match(URL_RE) ?? text.match(HOST_RE);
  if (!match) return null;
  const raw = match[0].replace(TRAILING_PUNCTUATION, '');
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/\.$/, '').toLowerCase();
    if (!host) return null;
    return { link: url.href, host };
  } catch {
    return null;
  }
}

/**
 * The last two labels of a host name. Good enough for demo data; not a public suffix lookup.
 * @param {string} host
 */
export function registeredDomain(host) {
  if (isIP(host.replace(/^\[|\]$/g, ''))) return host;
  return host.split('.').slice(-2).join('.');
}

/**
 * Answers a check from the fixtures.
 * @param {string} input
 * @param {Fixtures} fixtures
 * @returns {ScorerResponse}
 */
export function check(input, fixtures) {
  const found = extractLink(input);
  if (!found) {
    return { public: result(fixtures.noLink, null), report: null };
  }
  const { link, host } = found;
  const outcome =
    fixtures.domains.find((d) => host === d.domain || host.endsWith(`.${d.domain}`)) ??
    fixtures.unknown;
  return {
    public: result(outcome, link),
    report: { host, registered_domain: registeredDomain(host), score: outcome.score ?? 0 },
  };
}

/**
 * @param {Outcome} outcome
 * @param {string | null} link
 * @returns {CheckResult}
 */
function result(outcome, link) {
  return {
    verdict: outcome.verdict,
    unverified: outcome.unverified,
    link,
    destination: null,
    preview: null,
    reasons: outcome.reasons,
  };
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
  });
  res.end(data);
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string | null>} the body, or null when it is larger than MAX_BODY
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Creates the HTTP server. Call listen() on the result.
 * @param {Fixtures} [fixtures]
 */
export function createScorer(fixtures = loadFixtures()) {
  return createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    try {
      if (path === '/healthz') {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return send(res, 405, { detail: 'Method not allowed' });
        }
        return send(res, 200, { status: 'ok' });
      }
      if (path === '/v1/check') {
        if (req.method !== 'POST') return send(res, 405, { detail: 'Method not allowed' });
        const body = await readBody(req);
        if (body === null) return send(res, 413, { detail: 'Request body too large' });
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          return send(res, 400, { detail: 'Body must be JSON' });
        }
        if (typeof parsed?.input !== 'string') {
          return send(res, 422, { detail: 'input must be a string' });
        }
        return send(res, 200, check(parsed.input, fixtures));
      }
      return send(res, 404, { detail: 'Not found' });
    } catch {
      return send(res, 500, { detail: 'Internal error' });
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const fixtures = loadFixtures(process.env.FIXTURES ?? fileURLToPath(new URL('./fixtures.json', import.meta.url)));
  const port = Number(process.env.PORT ?? 8000);
  const host = process.env.HOST ?? '0.0.0.0';
  const server = createScorer(fixtures);
  server.listen(port, host, () => console.log(`stub scorer listening on ${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
