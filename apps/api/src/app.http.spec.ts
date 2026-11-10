import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { createOpenApiDocument } from './openapi';
import { PrismaService } from './prisma/prisma.service';
import { ScorerClient } from './scorer/scorer.client';

const TOKEN = 'test-admin-token-0123456789';
const ID = '6f1c2c8e-8f3e-4a52-9a43-4b0c4f0f2a11';

function fakePrisma() {
  return {
    report: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([{ host: 'ptt-teslimat.xyz' }]),
      update: jest.fn().mockResolvedValue({
        id: ID,
        url: 'http://ptt-teslimat.xyz/tr',
        host: 'ptt-teslimat.xyz',
        registeredDomain: 'ptt-teslimat.xyz',
        kind: 'SCAM',
        category: 'CARGO',
        score: 80,
        status: 'CONFIRMED',
        reviewedAt: new Date(),
        createdAt: new Date(),
      }),
      count: jest.fn().mockResolvedValue(2),
    },
  };
}

async function boot(adminToken?: string) {
  const previous = process.env.ADMIN_TOKEN;
  if (adminToken === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = adminToken;
  const prisma = fakePrisma();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(ScorerClient)
    .useValue({
      check: () =>
        Promise.resolve({
          public: { verdict: 'low', unverified: true, link: null, destination: null, reasons: [] },
          report: null,
        }),
    })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  if (previous === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = previous;
  return { app, prisma };
}

describe('rate limiting', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    ({ app } = await boot());
  });

  afterEach(() => app.close());

  const check = (forwardedFor: string) =>
    request(app.getHttpServer())
      .post('/v1/check')
      .set('X-Forwarded-For', forwardedFor)
      .send({ input: 'hi' });

  it('allows 20 checks a minute per client, then answers 429 with a message', async () => {
    for (let i = 0; i < 20; i++) {
      await check('203.0.113.7').expect(200);
    }
    const res = await check('203.0.113.7').expect(429);
    expect(res.body).toEqual({
      statusCode: 429,
      message: 'Too many requests. Please wait a minute and try again.',
    });
    expect(res.headers['retry-after']).toBeDefined();

    // Another client is not affected.
    await check('198.51.100.20').expect(200);
  });

  it('keys on the address the proxy appended, not on what the client claims', async () => {
    for (let i = 0; i < 20; i++) {
      // A client rotating a fake first entry still arrives from the same address.
      await check(`10.0.0.${i}, 203.0.113.7`).expect(200);
    }
    await check('10.9.9.9, 203.0.113.7').expect(429);
  });

  it('allows 10 reports a minute per client', async () => {
    const report = () =>
      request(app.getHttpServer())
        .post('/v1/reports')
        .set('X-Forwarded-For', '203.0.113.8')
        .send({ url: 'not a link' });
    for (let i = 0; i < 10; i++) {
      await report().expect(400);
    }
    await report().expect(429);
  });
});

describe('admin routes', () => {
  it('answer 503 on every route when ADMIN_TOKEN is unset', async () => {
    const { app } = await boot();
    const server = app.getHttpServer();
    await request(server).get('/v1/admin/reports').set('Authorization', 'Bearer x').expect(503);
    await request(server)
      .post(`/v1/admin/reports/${ID}/review`)
      .send({ decision: 'CONFIRMED' })
      .expect(503);
    await app.close();
  });

  describe('with ADMIN_TOKEN set', () => {
    let app: NestExpressApplication;
    let prisma: ReturnType<typeof fakePrisma>;
    const auth = { Authorization: `Bearer ${TOKEN}` };

    beforeAll(async () => {
      ({ app, prisma } = await boot(TOKEN));
    });

    afterAll(() => app.close());

    it('answer 401 to a wrong or missing token', async () => {
      const server = app.getHttpServer();
      await request(server).get('/v1/admin/reports').expect(401);
    });

    it('list reports with filters', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/reports?status=PENDING&kind=SCAM&limit=5000')
        .set(auth)
        .expect(200, []);
      expect(prisma.report.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { status: 'PENDING', kind: 'SCAM' }, take: 500 }),
      );
      await request(app.getHttpServer())
        .get('/v1/admin/reports?status=MAYBE')
        .set(auth)
        .expect(400);
    });

    it('review a report', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post(`/v1/admin/reports/${ID}/review`)
        .set(auth)
        .send({ decision: 'CONFIRMED' })
        .expect(200);
      expect(res.body).toMatchObject({ id: ID, status: 'CONFIRMED', domainReports: 2 });

      await request(server)
        .post(`/v1/admin/reports/${ID}/review`)
        .set(auth)
        .send({ decision: 'PENDING' })
        .expect(400);
      await request(server)
        .post('/v1/admin/reports/not-a-uuid/review')
        .set(auth)
        .send({ decision: 'REJECTED' })
        .expect(400);
    });

    it('serve the review page with a strict content security policy', async () => {
      const res = await request(app.getHttpServer()).get('/admin').expect(200);
      expect(res.headers['content-type']).toMatch(/^text\/html/);
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.headers['content-security-policy']).toContain("script-src 'self'");
      expect(res.text).toContain('src="/admin/admin.js"');
      const script = await request(app.getHttpServer()).get('/admin/admin.js').expect(200);
      expect(script.headers['content-type']).toMatch(/^text\/javascript/);
      expect(script.text).not.toContain('innerHTML');
    });

    it('stay out of the public API document', () => {
      const paths = Object.keys(createOpenApiDocument(app).paths);
      expect(paths).toContain('/v1/check');
      expect(paths.filter((p) => p.includes('admin'))).toEqual([]);
    });
  });
});
