import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { ScorerClient } from '../src/scorer/scorer.client';

describe('API (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ScorerClient)
      .useValue({
        check: () =>
          Promise.resolve({
            public: {
              verdict: 'low',
              unverified: true,
              link: null,
              destination: null,
              reasons: [],
            },
            report: null,
          }),
      })
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz', () =>
    request(app.getHttpServer()).get('/healthz').expect(200, { status: 'ok' }));

  it('POST /v1/check validates input', async () => {
    await request(app.getHttpServer()).post('/v1/check').send({ input: '' }).expect(400);
    await request(app.getHttpServer())
      .post('/v1/check')
      .send({ input: 'hi', extra: 1 })
      .expect(400);
    await request(app.getHttpServer()).post('/v1/check').send({ input: 'hi' }).expect(200);
  });
});
