import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminTokenGuard } from './admin-token.guard';

function guard(token?: string) {
  return new AdminTokenGuard({
    get: (_key: string, fallback: string) => token ?? fallback,
  } as unknown as ConfigService);
}

function context(authorization?: string): ExecutionContext {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('AdminTokenGuard', () => {
  it('answers 503 when no admin token is configured', () => {
    expect(() => guard().canActivate(context('Bearer anything'))).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard('  \n').canActivate(context('Bearer anything'))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('answers 401 for a missing, malformed or wrong token', () => {
    const g = guard('s3cret-token');
    expect(() => g.canActivate(context())).toThrow(UnauthorizedException);
    expect(() => g.canActivate(context('s3cret-token'))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(context('Basic s3cret-token'))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(context('Bearer s3cret'))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(context('Bearer s3cret-token-and-more'))).toThrow(
      UnauthorizedException,
    );
  });

  it('lets the right token through', () => {
    expect(guard('s3cret-token\n').canActivate(context('Bearer s3cret-token'))).toBe(true);
    expect(guard('s3cret-token').canActivate(context('bearer s3cret-token'))).toBe(true);
  });
});
