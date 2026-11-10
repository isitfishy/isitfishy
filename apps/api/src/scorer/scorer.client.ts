import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScorerResponse } from './scorer.types';

@Injectable()
export class ScorerClient {
  private readonly baseUrl: string;
  // Allow generous time for the scoring service.
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('SCORER_URL', 'http://localhost:8000');
    this.timeoutMs = Number(config.get<string>('SCORER_TIMEOUT_MS', '75000'));
  }

  async check(input: string): Promise<ScorerResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/check`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
    return (await res.json()) as ScorerResponse;
  }
}
