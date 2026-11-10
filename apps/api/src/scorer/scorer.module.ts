import { Module } from '@nestjs/common';
import { ScorerClient } from './scorer.client';

@Module({
  providers: [ScorerClient],
  exports: [ScorerClient],
})
export class ScorerModule {}
