import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateReportDto, ReportView, TrendingDomain } from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiCreatedResponse({ type: ReportView })
  @ApiBadRequestResponse({ description: 'Not a valid link.' })
  @ApiTooManyRequestsResponse()
  create(@Body() dto: CreateReportDto): Promise<ReportView> {
    return this.reports.create(dto);
  }

  @Get('trending')
  @ApiOkResponse({ type: [TrendingDomain] })
  trending(): Promise<TrendingDomain[]> {
    return this.reports.topDomains();
  }
}
