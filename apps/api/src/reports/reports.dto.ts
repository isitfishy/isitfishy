import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ReportCategory, ReportKind } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ description: 'The suspicious link only, not the message around it.' })
  @IsString()
  @Length(4, 2048)
  url!: string;

  @ApiPropertyOptional({ enum: ReportCategory, enumName: 'ReportCategory' })
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @ApiPropertyOptional({
    enum: ReportKind,
    enumName: 'ReportKind',
    description: 'SCAM (default) reports a scam; NOT_SCAM disputes a warning the app showed.',
  })
  @IsOptional()
  @IsEnum(ReportKind)
  kind?: ReportKind;
}

export class ReportView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class TrendingDomain {
  @ApiProperty()
  registeredDomain!: string;

  @ApiProperty({ description: 'Reports in the last 7 days.' })
  reports!: number;
}
