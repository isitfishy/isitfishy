import { BadRequestException, Injectable } from '@nestjs/common';
import { ReportCategory, ReportKind, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScorerClient } from '../scorer/scorer.client';
import { CreateReportDto, ReportView, TrendingDomain } from './reports.dto';

/**
 * Drops the query string and fragment: they often carry per-victim tracking tokens,
 * which would let a stored report point back to the person who received it.
 */
export function stripPersonalParts(raw: string): string {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  const url = new URL(withScheme);
  return `${url.protocol}//${url.host}${url.pathname}`;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scorer: ScorerClient,
  ) {}

  async create(dto: CreateReportDto): Promise<ReportView> {
    let url: string;
    try {
      url = stripPersonalParts(dto.url.trim());
    } catch {
      throw new BadRequestException('Not a valid link');
    }
    const { report } = await this.scorer.check(url);
    if (!report) {
      throw new BadRequestException('Not a valid link');
    }
    return this.prisma.report.create({
      data: {
        url,
        host: report.host,
        registeredDomain: report.registered_domain,
        category: dto.category ?? ReportCategory.OTHER,
        kind: dto.kind ?? ReportKind.SCAM,
        score: report.score,
      },
      select: { id: true, createdAt: true },
    });
  }

  /** Most reported domains in the last `days` days, for the public trends page. */
  async topDomains(days = 7, limit = 20): Promise<TrendingDomain[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.report.groupBy({
      by: ['registeredDomain'],
      // Disputed warnings are feedback on the app, not scam reports, and reports an
      // admin rejected do not count.
      where: {
        createdAt: { gte: since },
        kind: ReportKind.SCAM,
        status: { not: ReviewStatus.REJECTED },
      },
      _count: { _all: true },
      orderBy: { _count: { registeredDomain: 'desc' } },
      take: limit,
    });
    return rows.map((r) => ({ registeredDomain: r.registeredDomain, reports: r._count._all }));
  }
}
