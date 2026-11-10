import { Module } from '@nestjs/common';
import { AdminPageController } from './admin-page.controller';
import { AdminTokenGuard } from './admin-token.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, AdminPageController],
  providers: [AdminService, AdminTokenGuard],
})
export class AdminModule {}
