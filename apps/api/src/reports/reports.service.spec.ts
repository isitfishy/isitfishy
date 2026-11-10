import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScorerClient } from '../scorer/scorer.client';
import { ScorerResponse } from '../scorer/scorer.types';
import { ReportsService, stripPersonalParts } from './reports.service';

describe('stripPersonalParts', () => {
  it('drops query string and fragment', () => {
    expect(stripPersonalParts('https://ptt-teslimat.xyz/tr/odeme?id=905551112233#top')).toBe(
      'https://ptt-teslimat.xyz/tr/odeme',
    );
  });

  it('adds a scheme to bare hosts', () => {
    expect(stripPersonalParts('e-devlet-odeme.xyz/borc')).toBe('http://e-devlet-odeme.xyz/borc');
  });
});

describe('ReportsService.create', () => {
  const scored: ScorerResponse = {
    public: {
      verdict: 'high',
      unverified: false,
      link: null,
      destination: null,
      preview: null,
      reasons: [],
    },
    report: { host: 'e-devlet-odeme.xyz', registered_domain: 'e-devlet-odeme.xyz', score: 70 },
  };

  function setup(result: ScorerResponse) {
    const create = jest.fn((args: { data: Record<string, unknown> }) => ({
      id: '1',
      createdAt: new Date(),
      ...args.data,
    }));
    const check = jest.fn().mockResolvedValue(result);
    const prisma = { report: { create } } as unknown as PrismaService;
    const scorer = { check } as unknown as ScorerClient;
    return { service: new ReportsService(prisma, scorer), create, check };
  }

  it('stores only the cleaned link and scorer metadata', async () => {
    const { service, create, check } = setup(scored);
    await service.create({ url: 'e-devlet-odeme.xyz/borc?tc=12345678901' });

    expect(check).toHaveBeenCalledWith('http://e-devlet-odeme.xyz/borc');
    const { data } = create.mock.calls[0][0];
    expect(data).toEqual({
      url: 'http://e-devlet-odeme.xyz/borc',
      host: 'e-devlet-odeme.xyz',
      registeredDomain: 'e-devlet-odeme.xyz',
      category: 'OTHER',
      kind: 'SCAM',
      score: 70,
    });
  });

  it('rejects input the scorer does not see as a link', async () => {
    const { service } = setup({ ...scored, report: null });
    await expect(service.create({ url: 'not a link' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ReportsService.topDomains', () => {
  it('counts only scam reports an admin did not reject', async () => {
    const groupBy = jest
      .fn()
      .mockResolvedValue([{ registeredDomain: 'ptt-teslimat.xyz', _count: { _all: 3 } }]);
    const prisma = { report: { groupBy } } as unknown as PrismaService;
    const service = new ReportsService(prisma, {} as ScorerClient);

    await expect(service.topDomains()).resolves.toEqual([
      { registeredDomain: 'ptt-teslimat.xyz', reports: 3 },
    ]);
    const { where } = (groupBy.mock.calls as unknown[][])[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.kind).toBe('SCAM');
    expect(where.status).toEqual({ not: 'REJECTED' });
  });
});
