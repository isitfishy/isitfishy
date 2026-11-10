import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

const DEFAULT_PROXY_HOPS = 1;

/**
 * Number of proxies in front of the API. An empty or malformed value falls back to the
 * default instead of 0, which would put every client into the proxy's rate limit bucket.
 */
export function proxyHops(value: string | undefined): number {
  const hops = Number(value?.trim() || NaN);
  return Number.isInteger(hops) && hops >= 0 ? hops : DEFAULT_PROXY_HOPS;
}

/** Settings shared by the server and the tests that boot the whole app. */
export function configureApp(app: NestExpressApplication): void {
  // Traefik appends the address it received the request from to X-Forwarded-For. Trusting
  // exactly that many hops makes req.ip the real client and ignores whatever the client
  // put in the header itself, so nobody can dodge the rate limits by faking it.
  app.set('trust proxy', proxyHops(process.env.TRUST_PROXY_HOPS));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors();
}
