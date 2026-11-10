import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function asset(name: string): string {
  return readFileSync(join(__dirname, 'static', name), 'utf8');
}

const PAGE = asset('admin.html');
const SCRIPT = asset('admin.js');
const STYLE = asset('admin.css');

// The page shows links the public submitted: nothing but its own script, style and
// API calls may load, and it cannot be framed.
export const ADMIN_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * A small review page for admins. It needs no token to load: every action it takes
 * goes through the token-guarded /v1/admin routes.
 */
@ApiExcludeController()
@Controller('admin')
export class AdminPageController {
  @Get()
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('content-security-policy', ADMIN_CSP)
  @Header('x-content-type-options', 'nosniff')
  @Header('referrer-policy', 'no-referrer')
  @Header('cache-control', 'no-store')
  page(): string {
    return PAGE;
  }

  @Get('admin.js')
  @Header('content-type', 'text/javascript; charset=utf-8')
  @Header('x-content-type-options', 'nosniff')
  @Header('cache-control', 'no-store')
  script(): string {
    return SCRIPT;
  }

  @Get('admin.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('x-content-type-options', 'nosniff')
  @Header('cache-control', 'no-store')
  style(): string {
    return STYLE;
  }
}
