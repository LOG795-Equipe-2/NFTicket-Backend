import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppwriteService } from '../appwrite/appwrite.service';
import { BouncerController } from './bouncer.controller';
import { BouncerModule } from './bouncer.module';
import { BouncerService } from './bouncer.service';
import { NfticketTransactionService } from '../nfticket-transaction/nfticket-transaction.service';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { PerformanceAnalyserService } from '../performance-analyser/performance-analyser.service';

describe('BouncerController', () => {
  let controller: BouncerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BouncerModule, AppwriteService, AtomicAssetsQueryService],
      controllers: [BouncerController],
      providers: [BouncerService, ConfigService, AppwriteService, AtomicAssetsQueryService, NfticketTransactionService, PerformanceAnalyserService],
    }).compile();

    controller = module.get<BouncerController>(BouncerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
