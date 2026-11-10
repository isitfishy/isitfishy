import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ReportKind, ReviewStatus } from '@prisma/client';
import { AdminTokenGuard } from './admin-token.guard';
import { AdminReport, ReviewDto } from './admin.dto';
import { AdminService } from './admin.service';

const MAX_LIST = 500;

/** Review queue for reports. Not part of the public API document. */
@ApiExcludeController()
@UseGuards(AdminTokenGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  list(
    @Query('status', new ParseEnumPipe(ReviewStatus, { optional: true })) status?: ReviewStatus,
    @Query('kind', new ParseEnumPipe(ReportKind, { optional: true })) kind?: ReportKind,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ): Promise<AdminReport[]> {
    return this.admin.list({ status, kind, limit: Math.min(Math.max(limit, 1), MAX_LIST) });
  }

  @Post('reports/:id/review')
  @HttpCode(200)
  review(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewDto,
  ): Promise<AdminReport> {
    return this.admin.review(id, dto.decision);
  }
}
