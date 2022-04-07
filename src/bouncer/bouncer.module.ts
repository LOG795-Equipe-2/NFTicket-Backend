import { Module } from '@nestjs/common';
import { BouncerService } from './bouncer.service';
import { BouncerController } from './bouncer.controller';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import configuration from '../config/configuration';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { NfticketTransactionService } from '../nfticket-transaction/nfticket-transaction.service';
import { PerformanceAnalyserService } from '../performance-analyser/performance-analyser.service';

@Module({
  controllers: [BouncerController],
  providers: [BouncerService, AppwriteService, AtomicAssetsQueryService, NfticketTransactionService, PerformanceAnalyserService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
  }), AppwriteModule, AppwriteService]
})
export class BouncerModule {}
