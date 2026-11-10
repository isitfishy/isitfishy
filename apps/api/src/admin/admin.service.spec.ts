import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

const report = {
  id: '6f1c2c8e-8f3e-4a52-9a43-4b0c4f0f2a11',
  url: 'http://e-devlet-odeme.xyz/borc',
  host: 'e-devlet-odeme.xyz',
  registeredDomain: 'e-devlet-odeme.xyz',
  kind: 'SCAM',
  category: 'GOVERNMENT',
  score: 70,
  status: 'PENDING',
  reviewedAt: null,
  createdAt: new Date('2026-11-05T10:00:00Z'),
};

function setup(overrides: Record<string, jest.Mock> = {}) {
  const prisma = {
    report: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      ...overrides,
    },
  };
  return { service: new AdminService(prisma as unknown as PrismaService), report: prisma.report };
}

describe('AdminService.list', () => {
  it('returns newest reports with the report count of their domain', async () => {
    const short = { ...report, id: '2', url: 'https://bit.ly/abc', host: 'bit.ly' };
    const { service, report: db } = setup({
      findMany: jest
        .fn()
        .mockResolvedValue([report, { ...short, registeredDomain: 'bit.ly', kind: 'SCAM' }]),
      groupBy: jest.fn().mockResolvedValue([
        { registeredDomain: 'e-devlet-odeme.xyz', _count: { _all: 4 } },
        { registeredDomain: 'bit.ly', _count: { _all: 2 } },
      ]),
    });

    const rows = await service.list({ status: 'PENDING', kind: 'SCAM', limit: 50 });

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING', kind: 'SCAM' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
    expect(db.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { registeredDomain: { in: ['e-devlet-odeme.xyz', 'bit.ly'] } },
      }),
    );
    expect(rows.map((r) => [r.domainReports, r.shortener])).toEqual([
      [4, null],
      [2, 'bit.ly'],
    ]);
  });

  it('skips the count query when there is nothing to list', async () => {
    const { service, report: db } = setup();
    await expect(service.list({ limit: 50 })).resolves.toEqual([]);
    expect(db.groupBy).not.toHaveBeenCalled();
  });
});

describe('AdminService.review', () => {
  it('stores the decision and when it was made', async () => {
    const reviewed = { ...report, status: 'CONFIRMED', reviewedAt: new Date() };
    const { service, report: db } = setup({
      update: jest.fn().mockResolvedValue(reviewed),
      count: jest.fn().mockResolvedValue(3),
    });

    const row = await service.review(report.id, 'CONFIRMED');

    const args = (db.update.mock.calls as unknown[][])[0][0] as {
      where: unknown;
      data: { status: string; reviewedAt: Date };
    };
    expect(args.where).toEqual({ id: report.id });
    expect(args.data.status).toBe('CONFIRMED');
    expect(args.data.reviewedAt).toBeInstanceOf(Date);
    expect(row).toMatchObject({ status: 'CONFIRMED', domainReports: 3, shortener: null });
  });

  it('answers 404 for an unknown report', async () => {
    const missing = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '6',
    });
    const { service } = setup({ update: jest.fn().mockRejectedValue(missing) });
    await expect(service.review(report.id, 'REJECTED')).rejects.toBeInstanceOf(NotFoundException);
  });
});
