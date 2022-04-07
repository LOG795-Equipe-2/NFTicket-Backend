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

  describe('create ticket transaction', () => {
    it('should return the transactions to create a schema, collection and template', async () => {
      const transactionPendingIdExpected = "5h6j4ufj5u6j4h5"
      // Mock Get Collections to return nothing.
      jest.spyOn(atomicAssetsService, 'getCollections').mockImplementation(() => 
        Promise.resolve({
          rows: [],
            more: false,
            next_key: "",
            next_key_bytes: ""
        })
      );
      jest.spyOn(atomicAssetsService, 'getSchemas').mockImplementation(() => 
        Promise.resolve({
          rows: [],
            more: false,
            next_key: "",
            next_key_bytes: ""
        })
      );
      jest.spyOn(appwriteService, 'createTransactionPending').mockImplementation(() => 
        Promise.resolve({
          $id: transactionPendingIdExpected,
          $collection: '', 
          $read: [''], 
          $write: ['']
        })
      );
    const userName = 'testUsername'
    const createdTickets = [
      {
          eventName: "test",
          locationName: "Centre Bell",
          originalDateTime: "2022-01-20T20:00",
          originalPrice: 20.56,
          categoryName: "VIP",
          numberOfTickets: 1
      } as Ticket,
      {
          eventName: "test",
          locationName: "Centre Vidéotron",
          originalDateTime: "2022-01-22T20:00",
          originalPrice: 50,
          categoryName: "VIP",
          numberOfTickets: 2
      } as Ticket
  ]
    const createdTemplate1Expected = {
      "account": configService.get<string>('atomicAssetContractAccountName'), 
      "data": {
        "authorized_creator": userName, 
        "burnable": true, 
        "collection_name": userName, 
        "immutable_data": [
          {"key": "name", "value": ["string", createdTickets[0].eventName]}, 
          {"key": "locationName", "value": ["string", createdTickets[0].locationName]}, 
          {"key": "originalDateTime", "value": ["string", createdTickets[0].originalDateTime]}, 
          {"key": "originalPrice", "value": ["string", createdTickets[0].originalPrice.toString()]}, 
          {"key": "categoryName", "value": ["string", createdTickets[0].categoryName ]}
        ], 
        "max_supply": 0, 
        "schema_name": "ticket", 
        "transferable": true}, 
        "name": "createtempl"
    }
    const createdTemplate2Expected = {
      "account": configService.get<string>('atomicAssetContractAccountName'), 
      "data": {
        "authorized_creator": userName, 
        "burnable": true, 
        "collection_name": userName, 
        "immutable_data": [
          {"key": "name", "value": ["string", createdTickets[1].eventName]}, 
          {"key": "locationName", "value": ["string", createdTickets[1].locationName]}, 
          {"key": "originalDateTime", "value": ["string", createdTickets[1].originalDateTime]}, 
          {"key": "originalPrice", "value": ["string", createdTickets[1].originalPrice.toString()]}, 
          {"key": "categoryName", "value": ["string", createdTickets[1].categoryName ]}
        ], 
        "max_supply": 0, 
        "schema_name": "ticket", 
        "transferable": true}, 
        "name": "createtempl"
    }
    const createdColExpectedTransaction = {
      "account": configService.get<string>('atomicAssetContractAccountName'), 
      "name": "createcol",
      "data": {
        "allow_notify": true, 
        "author": userName, 
        "authorized_accounts": [userName, configService.get<string>('tempAccountOwnerAssets')], 
        "collection_name": userName, 
        "data": [], 
        "market_fee": 0, 
        "notify_accounts": []
      }
    }
    const createdSchemaExpectedTransaction = {
      "account": configService.get<string>('atomicAssetContractAccountName'), 
      "name": "createschema",
      "data": {
        "authorized_creator": userName, 
        "collection_name": userName, 
        "schema_format": [
          {"name": "name", "type": "string"},
          {"name": "locationName", "type": "string"}, 
          {"name": "originalDateTime", "type": "string"}, 
          {"name": "originalPrice", "type": "string"}, 
          {"name": "categoryName", "type": "string"}, 
          {"name": "signed", "type": "bool"}
        ], 
        "schema_name": "ticket"
      }
    }
    const passedBody = { 
        tickets: createdTickets
    }
    const responseFromController = await controller.postActionsCreateTicket(passedBody, userName);
    expect(responseFromController.success).toBe(true)
    expect(responseFromController.data.transactionId).toBeNull()
    expect(responseFromController.data.userName).toBe(userName)
    expect(responseFromController.data.transactionType).toBe(TransactionType.CREATE_TICKET)
    expect(responseFromController.data.transactionPendingId).toBe(transactionPendingIdExpected)
    expect(responseFromController.data.transactionsBody).toHaveLength(4)
    expect(responseFromController.data.transactionsBody).toEqual(
      expect.arrayContaining([
        createdColExpectedTransaction, createdSchemaExpectedTransaction, 
        createdTemplate1Expected, createdTemplate2Expected
      ])
    )
    });
  })
});
