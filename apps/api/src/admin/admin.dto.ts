import { ReportCategory, ReportKind, ReviewStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export const DECISIONS = [ReviewStatus.CONFIRMED, ReviewStatus.REJECTED] as const;
export type Decision = (typeof DECISIONS)[number];

export class ReviewDto {
  @IsIn(DECISIONS)
  decision!: Decision;
}

export interface AdminReport {
  id: string;
  url: string;
  host: string;
  registeredDomain: string;
  kind: ReportKind;
  category: ReportCategory;
  score: number | null;
  status: ReviewStatus;
  reviewedAt: Date | null;
  createdAt: Date;
  /** All reports, of any kind or status, for the same registered domain. */
  domainReports: number;
  /** The shortener service when the link is a short link, else null. */
  shortener: string | null;
}
