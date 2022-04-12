import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionController } from './nfticket-transaction.controller';
import { NfticketTransactionModule } from './nfticket-transaction.module';
import { NfticketTransactionService } from './nfticket-transaction.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { TransactionType } from '../utilities/NfticketTransactionType';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { Ticket } from '../utilities/TicketObject.dto';
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
  
  describe('utility transactions', () => {
    it('should return the parameters to connect to the blockchain', () => {
      const expectedResponse = {
        success: true,
        data: {
          blockchainUrl: configService.get<string>('blockchainNodeUrl'),
          appName: configService.get<string>('appName'),
          chainId: configService.get<string>('chainId'),
          systemTokenBlockchain: configService.get<string>('blockchainTokenSymbol'),
          systemTokenFixedPrecision: configService.get<number>('blockchainTokenFixedPrecision')
        }
      }
      expect(controller.getInitiateTransactions()).toStrictEqual(expectedResponse);
    });

    it('should return the appropriate collName for the requested user if less than 12 character', () => {
      const expectedResponse = {
        success: true,
        data: 'nftiusername'
      }
      expect(controller.getCollNameForUser('username')).toStrictEqual(expectedResponse);
    });
    
    it('should return the appropriate collName for the requested user if equals than 12 character', () => {
      const expectedResponse = {
        success: true,
        data: 'usernameATA1'
      }
      expect(controller.getCollNameForUser('usernameATA1')).toStrictEqual(expectedResponse);
    });

    it('should return the appropriate collName for the requested user if more than 12 character', () => {
      const expectedResponse = {
        success: true,
        data: 'usernameATA1'
      }
      expect(controller.getCollNameForUser('usernameATA1123')).toStrictEqual(expectedResponse);
    });

    it('should refuse to execute request if api key and project id are not provided', async () => {
      const expectedResponse = {
        success: false,
        errorMessage: 'Invalid credentials'
      }
      expect(await controller.deleteAllTransactionsPending(null, null)).toStrictEqual(expectedResponse);
      expect(await controller.deleteAllTransactionsPending(undefined, undefined)).toStrictEqual(expectedResponse);
      expect(await controller.deleteAllTransactionsPending(configService.get<string>('appwriteProjectId'), undefined)).toStrictEqual(expectedResponse);
      expect(await controller.deleteAllTransactionsPending(undefined, configService.get<string>('appwriteSecret'))).toStrictEqual(expectedResponse);
      expect(await controller.deleteAllTransactionsPending('dummy', 'dummy2')).toStrictEqual(expectedResponse);
    })

    it('should return success if document were correctly deleted', async () => {
      let expectedNumberOfDocumentsDeleted = 10;
      const expectedResponse = {
        success: true,
        errorMessage: expectedNumberOfDocumentsDeleted + " expired transactions pending deleted. More might remain."
      }
      jest.spyOn(appwriteService, 'getTransactionsPendingExpired').mockImplementation(() => 
        Promise.resolve([{ $id: 'dummy' },{ $id: 'dummy' }, { $id: 'dummy' }, 
        { $id: 'dummy' }, { $id: 'dummy' }, { $id: 'dummy' }, { $id: 'dummy' }, 
        { $id: 'dummy' }, { $id: 'dummy' }, { $id: 'dummy' }])
      );
      expect(await controller.deleteAllTransactionsPending(configService.get<string>('appwriteProjectId'), configService.get<string>('appwriteSecret'))).toStrictEqual(expectedResponse);
    });
  });
});
