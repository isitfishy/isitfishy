import { Module } from '@nestjs/common';
import { ScorerModule } from '../scorer/scorer.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ScorerModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
