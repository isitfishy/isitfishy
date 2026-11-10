import { Test } from '@nestjs/testing';
import { ScorerClient } from '../scorer/scorer.client';
import { CheckController } from './check.controller';

describe('CheckController', () => {
  it('passes the input to the scorer and returns only the public part', async () => {
    const result = { verdict: 'low', unverified: true, link: null, destination: null, reasons: [] };
    const report = { host: 'x.example', registered_domain: 'x.example', score: 7 };
    const scorer = { check: jest.fn().mockResolvedValue({ public: result, report }) };
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckController],
      providers: [{ provide: ScorerClient, useValue: scorer }],
    }).compile();

    const controller = moduleRef.get(CheckController);
    await expect(controller.check({ input: 'hello' })).resolves.toBe(result);
    expect(scorer.check).toHaveBeenCalledWith('hello');
  });
});
