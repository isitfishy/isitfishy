import type { components, paths } from './schema';

export type { components, paths };

type Schemas = components['schemas'];
export type CheckResult = Schemas['CheckResult'];
export type Reason = Schemas['Reason'];
export type Verdict = Schemas['Verdict'];
export type ReportCategory = Schemas['ReportCategory'];
export type ReportKind = Schemas['ReportKind'];
export type CreateReport = Schemas['CreateReportDto'];
export type Report = Schemas['ReportView'];
export type TrendingDomain = Schemas['TrendingDomain'];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`isitfishy API returned ${status}`);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export function createApiClient({ baseUrl, fetch: fetchImpl = fetch }: ApiClientOptions) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(method: 'GET' | 'POST', path: keyof paths, body?: unknown) {
    const res = await fetchImpl(`${root}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, data);
    }
    return data as T;
  }

  return {
    /** Checks a link, QR payload or SMS body. The input is not stored. */
    check: (input: string) => request<CheckResult>('POST', '/v1/check', { input }),
    /** Reports a scam link. Only the link without its query string is stored. */
    report: (report: CreateReport) => request<Report>('POST', '/v1/reports', report),
    /** Most reported domains in the last 7 days. */
    trending: () => request<TrendingDomain[]>('GET', '/v1/reports/trending'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
