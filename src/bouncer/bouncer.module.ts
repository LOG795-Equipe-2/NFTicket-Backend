import { Module } from '@nestjs/common';
import { BouncerService } from './bouncer.service';
import { BouncerController } from './bouncer.controller';
import { AppwriteModule } from 'src/appwrite/appwrite.module';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [BouncerController],
  providers: [BouncerService],
  imports: [ConfigService, AppwriteModule]
})
export class BouncerModule {}
