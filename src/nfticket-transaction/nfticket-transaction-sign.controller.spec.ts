import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionController } from './nfticket-transaction.controller';
import { NfticketTransactionModule } from './nfticket-transaction.module';
import { NfticketTransactionService } from './nfticket-transaction.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryServiceTestProvider } from './DTO/AtomicAssetsQueryServiceTestProvider';
import { AppwriteServiceTestProvider } from '../appwrite/DTO/AppwriteServiceTestProvider';
import { PerformanceAnalyserService } from '../performance-analyser/performance-analyser.service';

describe('NfticketTransactionController', () => {
    let controller: NfticketTransactionController;
    let service: NfticketTransactionService;
    let atomicAssetsService: AtomicAssetsQueryServiceTestProvider;
    let appwriteService: AppwriteServiceTestProvider;
    let configService: ConfigService

    beforeEach(async () => {
        atomicAssetsService = new AtomicAssetsQueryServiceTestProvider();
        appwriteService = new AppwriteServiceTestProvider();

        const module: TestingModule = await Test.createTestingModule({
            imports: [NfticketTransactionModule, AppwriteService, ConfigService,
                AtomicAssetsQueryServiceTestProvider, AppwriteServiceTestProvider],
            controllers: [NfticketTransactionController],
            providers: [NfticketTransactionService, AppwriteService, AtomicAssetsQueryService, PerformanceAnalyserService]
        })
            .overrideProvider(AtomicAssetsQueryService)
            .useValue(atomicAssetsService)
            .overrideProvider(AppwriteService)
            .useValue(appwriteService)
            .compile();

        configService = module.get<ConfigService>(ConfigService);
        service = module.get<NfticketTransactionService>(NfticketTransactionService);
        controller = module.get<NfticketTransactionController>(NfticketTransactionController);
    });

    describe('Not finished yet', () => {
        it('should be defined', async () => {
            expect(controller).toBeDefined()
        });
    });
});
