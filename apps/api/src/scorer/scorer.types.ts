import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VERDICTS = ['low', 'medium', 'high'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const REASON_GROUPS = ['evidence', 'warning', 'reassurance'] as const;
export type ReasonGroup = (typeof REASON_GROUPS)[number];

export class Reason {
  @ApiProperty({ enum: REASON_GROUPS, enumName: 'ReasonGroup' })
  group!: ReasonGroup;

  @ApiProperty({
    description: 'Explanation keyed by language code.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  message!: Record<string, string>;
}

export class CheckResult {
  @ApiProperty({ enum: VERDICTS, enumName: 'Verdict' })
  verdict!: Verdict;

  @ApiProperty({ description: 'True when the verdict is low but nothing speaks for the link.' })
  unverified!: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The link the verdict is about.',
  })
  link!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Where it leads, if known.' })
  destination!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Base64 JPEG of the page behind the link, when it could be opened.',
  })
  preview!: string | null;

  @ApiProperty({ type: [Reason] })
  reasons!: Reason[];
}

/** What is stored with a report. Never returned to clients. */
export interface ReportFacts {
  host: string;
  registered_domain: string;
  score: number;
}

export interface ScorerResponse {
  public: CheckResult;
  report: ReportFacts | null;
}
