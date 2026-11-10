import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Counts requests per client address, as resolved by the trust proxy setting. */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: { ip?: string }): Promise<string> {
    return Promise.resolve(req.ip ?? 'unknown');
  }
}
