import { Module } from '@nestjs/common';
import { BouncerService } from './bouncer.service';
import { BouncerController } from './bouncer.controller';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import configuration from '../config/configuration';

@Module({
  controllers: [BouncerController],
  providers: [BouncerService, AppwriteService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
  }), AppwriteModule, AppwriteService]
})
export class BouncerModule {}
