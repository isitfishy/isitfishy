import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MAX_BODY, check, createScorer, extractLink, loadFixtures, registeredDomain } from '../server.js';

const fixtures = loadFixtures();
const LANGUAGES = ['tr', 'en', 'de', 'es', 'fr', 'it'];

describe('extractLink', () => {
  it('finds a URL inside a message', () => {
    assert.deepEqual(extractLink('Your parcel is waiting: https://parcel.example-scam.test/track?id=1.'), {
      link: 'https://parcel.example-scam.test/track?id=1',
      host: 'parcel.example-scam.test',
    });
  });

  it('finds a bare host name', () => {
    assert.deepEqual(extractLink('see www.Example.com/about, thanks'), {
      link: 'https://www.example.com/about',
      host: 'www.example.com',
    });
  });

  it('returns null when there is no link', () => {
    assert.equal(extractLink('hello there. e.g. nothing here'), null);
    assert.equal(extractLink(''), null);
  });
});

describe('registeredDomain', () => {
  it('keeps the last two labels', () => {
    assert.equal(registeredDomain('a.b.example-scam.test'), 'example-scam.test');
    assert.equal(registeredDomain('example.com'), 'example.com');
  });

  it('leaves IP addresses alone', () => {
    assert.equal(registeredDomain('192.0.2.10'), '192.0.2.10');
  });
});

describe('check', () => {
  it('flags the scam sample domain as high', () => {
    const res = check('Pay now at https://pay.example-scam.test/x', fixtures);
    assert.equal(res.public.verdict, 'high');
    assert.equal(res.public.unverified, false);
    assert.equal(res.public.link, 'https://pay.example-scam.test/x');
    assert.deepEqual(res.public.reasons.map((r) => r.group), ['evidence']);
    assert.deepEqual(res.report, {
      host: 'pay.example-scam.test',
      registered_domain: 'example-scam.test',
      score: 90,
    });
  });

  it('marks the suspicious sample domain as medium', () => {
    const res = check('example-suspicious.test', fixtures);
    assert.equal(res.public.verdict, 'medium');
    assert.deepEqual(res.public.reasons.map((r) => r.group), ['warning']);
  });

  it('marks example.com as low and verified', () => {
    const res = check('https://www.example.com', fixtures);
    assert.equal(res.public.verdict, 'low');
    assert.equal(res.public.unverified, false);
    assert.deepEqual(res.public.reasons.map((r) => r.group), ['reassurance']);
  });

  it('does not match a host that only ends with the same letters', () => {
    const res = check('https://notexample.com', fixtures);
    assert.equal(res.public.verdict, 'low');
    assert.equal(res.public.unverified, true);
  });

  it('answers low and unverified for anything else', () => {
    const res = check('https://somewhere.invalid/path', fixtures);
    assert.equal(res.public.verdict, 'low');
    assert.equal(res.public.unverified, true);
    assert.equal(res.report?.host, 'somewhere.invalid');
    assert.equal(res.report?.score, 0);
  });

  it('answers without a report when there is no link', () => {
    const res = check('just some words', fixtures);
    assert.equal(res.public.link, null);
    assert.equal(res.public.unverified, true);
    assert.equal(res.report, null);
  });

  it('always fills the public fields', () => {
    const res = check('https://example.com', fixtures);
    assert.deepEqual(Object.keys(res.public).sort(), [
      'destination', 'link', 'preview', 'reasons', 'unverified', 'verdict',
    ]);
    assert.equal(res.public.destination, null);
    assert.equal(res.public.preview, null);
  });
});

describe('fixtures', () => {
  const outcomes = [...fixtures.domains, fixtures.unknown, fixtures.noLink];

  it('translate every reason into all app languages', () => {
    for (const outcome of outcomes) {
      for (const reason of outcome.reasons) {
        assert.deepEqual(Object.keys(reason.message).sort(), [...LANGUAGES].sort());
        for (const lang of LANGUAGES) assert.ok(reason.message[lang].length > 0);
      }
    }
  });

  it('use only known verdicts and groups', () => {
    for (const outcome of outcomes) {
      assert.ok(['low', 'medium', 'high'].includes(outcome.verdict));
      for (const reason of outcome.reasons) {
        assert.ok(['evidence', 'warning', 'reassurance'].includes(reason.group));
      }
    }
  });
});

describe('HTTP server', () => {
  /** @type {import('node:http').Server} */
  let server;
  let base = '';

  before(async () => {
    server = createScorer(fixtures);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
    const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
    base = `http://127.0.0.1:${addr.port}`;
  });

  after(() => new Promise((resolve) => server.close(() => resolve(undefined))));

  /** @param {unknown} body */
  const post = (body) =>
    fetch(`${base}/v1/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('reports health', async () => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  it('answers a check', async () => {
    const res = await post({ input: 'https://login.example-scam.test' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    const body = await res.json();
    assert.equal(body.public.verdict, 'high');
    assert.equal(body.report.registered_domain, 'example-scam.test');
  });

  it('rejects a body that is not JSON', async () => {
    assert.equal((await post('not json')).status, 400);
  });

  it('rejects a missing or non-string input', async () => {
    assert.equal((await post({})).status, 422);
    assert.equal((await post({ input: 42 })).status, 422);
    assert.equal((await post(null)).status, 422);
  });

  it('rejects an oversized body', async () => {
    assert.equal((await post({ input: 'x'.repeat(MAX_BODY) })).status, 413);
  });

  it('rejects other methods and paths', async () => {
    assert.equal((await fetch(`${base}/v1/check`)).status, 405);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});
