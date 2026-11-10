import { Module } from '@nestjs/common';
import { ScorerModule } from '../scorer/scorer.module';
import { CheckController } from './check.controller';

@Module({
  imports: [ScorerModule],
  controllers: [CheckController],
})
export class CheckModule {}
