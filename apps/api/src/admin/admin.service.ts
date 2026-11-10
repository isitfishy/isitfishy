import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportKind, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminReport, Decision } from './admin.dto';
import { shortenerOf } from './shorteners';

const REPORT_FIELDS = {
  id: true,
  url: true,
  host: true,
  registeredDomain: true,
  kind: true,
  category: true,
  score: true,
  status: true,
  reviewedAt: true,
  createdAt: true,
} satisfies Prisma.ReportSelect;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof REPORT_FIELDS }>;

export interface ListFilter {
  status?: ReviewStatus;
  kind?: ReportKind;
  limit: number;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest reports first, each with the number of reports for its registered domain. */
  async list({ status, kind, limit }: ListFilter): Promise<AdminReport[]> {
    const rows = await this.prisma.report.findMany({
      where: { status, kind },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: REPORT_FIELDS,
    });
    const domains = [...new Set(rows.map((r) => r.registeredDomain))];
    const counts = domains.length
      ? await this.prisma.report.groupBy({
          by: ['registeredDomain'],
          where: { registeredDomain: { in: domains } },
          _count: { _all: true },
        })
      : [];
    const byDomain = new Map(counts.map((c) => [c.registeredDomain, c._count._all]));
    return rows.map((r) => this.view(r, byDomain.get(r.registeredDomain) ?? 1));
  }

  async review(id: string, decision: Decision): Promise<AdminReport> {
    let row: ReportRow;
    try {
      row = await this.prisma.report.update({
        where: { id },
        data: { status: decision, reviewedAt: new Date() },
        select: REPORT_FIELDS,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('No such report');
      }
      throw err;
    }
    const domainReports = await this.prisma.report.count({
      where: { registeredDomain: row.registeredDomain },
    });
    return this.view(row, domainReports);
  }

  private view(row: ReportRow, domainReports: number): AdminReport {
    return { ...row, domainReports, shortener: shortenerOf(row.registeredDomain) };
  }
}
