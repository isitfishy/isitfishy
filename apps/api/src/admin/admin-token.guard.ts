import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value: string): Buffer {
  // Hashing first gives both sides the same length, so the comparison leaks nothing
  // about the token, not even its length.
  return createHash('sha256').update(value).digest();
}

/** Lets a request through only with "Authorization: Bearer <ADMIN_TOKEN>". */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  private readonly expected: Buffer | null;

  constructor(config: ConfigService) {
    // Secrets mounted from a file often end with a newline.
    const token = config.get<string>('ADMIN_TOKEN', '').trim();
    this.expected = token ? digest(token) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) {
      throw new ServiceUnavailableException('The admin API is disabled on this server');
    }
    const req = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header) : null;
    if (!match || !timingSafeEqual(digest(match[1]), this.expected)) {
      throw new UnauthorizedException('Wrong or missing admin token');
    }
    return true;
  }
}
