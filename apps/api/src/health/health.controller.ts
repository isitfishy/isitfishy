import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

class HealthStatus {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

@ApiTags('health')
@SkipThrottle()
@Controller('healthz')
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthStatus })
  health(): HealthStatus {
    return { status: 'ok' };
  }
}
