import { Module } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';
import { AppwriteController } from './appwrite.controller';
import { ConfigService } from '@nestjs/config';
import { AppwriteGuard } from './appwrite.guard';

@Module({
  controllers: [AppwriteController],
  providers: [AppwriteService],
  imports: [ConfigService],
  exports: [AppwriteService]
})
export class AppwriteModule { }
