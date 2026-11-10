import { ApiError, createApiClient } from '../index';

function fakeFetch(status: number, body: unknown) {
  return jest.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
}

describe('createApiClient', () => {
  it('posts the input to /v1/check and returns the result', async () => {
    const result = { verdict: 'low', unverified: true, link: null, destination: null, reasons: [] };
    const fetch = fakeFetch(200, result);
    const api = createApiClient({ baseUrl: 'http://api.test/', fetch });

    await expect(api.check('hello')).resolves.toEqual(result);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://api.test/v1/check');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ input: 'hello' }));
  });

  it('sends no body on GET requests', async () => {
    const fetch = fakeFetch(200, []);
    const api = createApiClient({ baseUrl: 'http://api.test', fetch });

    await expect(api.trending()).resolves.toEqual([]);
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });

  it('throws ApiError with the status and body on failure', async () => {
    const body = { message: 'Not a valid link' };
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fakeFetch(400, body) });

    const error: unknown = await api.report({ url: 'nope' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, body });
  });
});
