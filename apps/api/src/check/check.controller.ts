import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ScorerClient } from '../scorer/scorer.client';
import { CheckResult } from '../scorer/scorer.types';
import { CheckDto } from './check.dto';

@ApiTags('check')
@Controller('v1/check')
export class CheckController {
  constructor(private readonly scorer: ScorerClient) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ type: CheckResult })
  @ApiServiceUnavailableResponse({ description: 'Temporarily unavailable.' })
  @ApiTooManyRequestsResponse()
  async check(@Body() dto: CheckDto): Promise<CheckResult> {
    return (await this.scorer.check(dto.input)).public;
  }
}
