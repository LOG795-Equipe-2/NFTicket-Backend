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
import { NfticketTransactionObject } from '../utilities/NfticketTransactionObject.dto';
import { AtomicAssetsCreateTemplActionData } from '../utilities/EosTransactionRequestObject.dto';
import { EosTransactionRequestObject } from "../utilities/EosTransactionRequestObject.dto";
import { TransactionsPendingModel } from 'src/interface/appwrite.model';

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
  
  describe('create ticket transaction for the first part (before signing)', () => {
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
          {"name": "signed", "type": "bool"},
          {"name": "used", "type": "uint8"}
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

    it('should return the transactions to create a schema and a template', async () => {
      const transactionPendingIdExpected = "5h6j4ufj5u6j4h5"
      const collectionName = "testCollectn"
      const userName = 'testUsername'
      // Mock Get Collections to return nothing.
      jest.spyOn(atomicAssetsService, 'getCollections').mockImplementation(() => 
        Promise.resolve({
          rows: [{
              "collection_name": collectionName,
              "author": userName,
              "allow_notify": 1,
              "authorized_accounts": [
                  userName,
                  "nfticket"
              ],
              "notify_accounts": [],
              "market_fee": "0.00000000000000000",
              "serialized_data": []
          }],
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
          {"name": "signed", "type": "bool"},
          {"name": "used", "type": "uint8"}
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
    expect(responseFromController.data.transactionsBody).toHaveLength(3)
    expect(responseFromController.data.transactionsBody).toEqual(
      expect.arrayContaining([
        createdSchemaExpectedTransaction, 
        createdTemplate1Expected, createdTemplate2Expected
      ])
    )
    });

    it('should return the transactions to create a schema and a template', async () => {
      const transactionPendingIdExpected = "5h6j4ufj5u6j4h5"
      const collectionName = "testCollectn"
      const userName = 'testUsername'
      const schemaName = "ticket"
      // Mock Get Collections to return nothing.
      jest.spyOn(atomicAssetsService, 'getCollections').mockImplementation(() => 
        Promise.resolve({
          rows: [{
              "collection_name": collectionName,
              "author": userName,
              "allow_notify": 1,
              "authorized_accounts": [
                  userName,
                  "nfticket"
              ],
              "notify_accounts": [],
              "market_fee": "0.00000000000000000",
              "serialized_data": []
          }],
            more: false,
            next_key: "",
            next_key_bytes: ""
        })
      );
      jest.spyOn(atomicAssetsService, 'getSchemas').mockImplementation(() => 
        Promise.resolve({
          rows: [{
            "schema_name": schemaName,
            "format": [
                { "name": "name", "type": "string"},
                { "name": "locationName", "type": "string" },
                { "name": "originalDateTime", "type": "string" },
                { "name": "originalPrice", "type": "string" },
                { "name": "categoryName", "type": "string" },
                { "name": "signed", "type": "bool" },
                { "name": "used", "type": "uint8" }
            ]
        }],
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
    const passedBody = { 
        tickets: createdTickets
    }
    const responseFromController = await controller.postActionsCreateTicket(passedBody, userName);
    expect(responseFromController.success).toBe(true)
    expect(responseFromController.data.transactionId).toBeNull()
    expect(responseFromController.data.userName).toBe(userName)
    expect(responseFromController.data.transactionType).toBe(TransactionType.CREATE_TICKET)
    expect(responseFromController.data.transactionPendingId).toBe(transactionPendingIdExpected)
    expect(responseFromController.data.transactionsBody).toHaveLength(2)
    expect(responseFromController.data.transactionsBody).toEqual(
      expect.arrayContaining([ createdTemplate1Expected, createdTemplate2Expected ])
    )
    });
  });

  it('create ticket for the second part but no transactions pending are initiated', async () => {
    const transactionPendingId = "5hjfd468hgfas5674"
    const userName = 'testUsername'
    jest.spyOn(appwriteService, 'getTransactionPendingInfo').mockImplementation(() => {
        throw new Error("No transaction pending");
    });

    const transactionId = "h5jfu4myigu5ng"
    const atomicAssetUserName = 'atomicassets'
    const passedBody = {
      transactionId: transactionId,
      signatures: ['SignatureOFTICKET'],
      serializedTransaction: [''],
      transactionType: TransactionType.CREATE_TICKET,
      transactionsBody: [
        {
          account: atomicAssetUserName,
          name: 'createtempl',
          data: {
            authorized_creator: userName,
            collection_name: 'nftikanthyn',
            schema_name: 'ticket',
            transferable: true,
            burnable: true,
            max_supply: 0,
            immutable_data: [
              { key: 'locationName', value: ['string', 'gfds'] },
              { key: 'name', value: ['string', 'gfds'] },
              { key: 'originalDateTime', value: [ 'string','Thu Mar 17 2022 23:43:11 GMT-0400 (Eastern Daylight Time)',
                ] },
              { key: 'originalPrice', value: ['string', '12'] },
              { key: 'categoryName', value: ['string', 'normal'] },
            ],
          } as AtomicAssetsCreateTemplActionData,
        } as EosTransactionRequestObject,
      ],
      userName: userName,
      transactionPendingId: transactionPendingId,
    } as NfticketTransactionObject;

    const responseFromController = await controller.postValidateCreateTicket(passedBody);
    expect(responseFromController.success).toBe(false)
    expect(responseFromController.errorMessage).toContain("never initiated")
  });

  it('create ticket for the second part but no transactions pending has expired', async () => {
    const transactionPendingId = "5hjfd468hgfas5674"
    const userName = 'testUsername'
    jest.spyOn(appwriteService, 'getTransactionPendingInfo').mockImplementation((transactionPendingId) => 
        Promise.resolve({
        $id: transactionPendingId,
        $collection: '', 
        $read: [''], 
        $write: [''],
        expirationDate: new Date().getTime() - 1000,
        data: "{}" } as TransactionsPendingModel)
    );
    const transactionId = "h5jfu4myigu5ng"
    const atomicAssetUserName = 'atomicassets'
    const passedBody = {
      transactionId: transactionId,
      signatures: ['SignatureOFTICKET'],
      serializedTransaction: [''],
      transactionType: TransactionType.CREATE_TICKET,
      transactionsBody: [
        {
          account: atomicAssetUserName,
          name: 'createtempl',
          data: {
            authorized_creator: userName,
            collection_name: 'nftikanthyn',
            schema_name: 'ticket',
            transferable: true,
            burnable: true,
            max_supply: 0,
            immutable_data: [
              { key: 'locationName', value: ['string', 'gfds'] },
              { key: 'name', value: ['string', 'gfds'] },
              { key: 'originalDateTime', value: [ 'string','Thu Mar 17 2022 23:43:11 GMT-0400 (Eastern Daylight Time)',
                ] },
              { key: 'originalPrice', value: ['string', '12'] },
              { key: 'categoryName', value: ['string', 'normal'] },
            ],
          } as AtomicAssetsCreateTemplActionData,
        } as EosTransactionRequestObject,
      ],
      userName: userName,
      transactionPendingId: transactionPendingId,
    } as NfticketTransactionObject;

    const responseFromController = await controller.postValidateCreateTicket(passedBody);
    expect(responseFromController.success).toBe(false)
    expect(responseFromController.errorMessage).toContain("expired")
    expect(appwriteService.deleteTransactionPendingInfo).toBeCalledTimes(1)
    expect(appwriteService.deleteTransactionPendingInfo).toBeCalledWith(transactionPendingId)
  });

  it('create ticket for the second part (actual logic for creation in backend, once signed)', async () => {
    const transactionPendingId = "5hjfd468hgfas5674"
    const userName = 'testUsername'
    const atomicAssetUserName = 'atomicassets'
    const testCollectionName = 'testUsername'
    const transactionId = "h5jfu4myigu5ng"
    const templateIdExpected = 90

    const template_data_object = {
        locationName: 'gfds',
        name: 'gfds',
        originalDateTime: 'Thu Mar 17 2022 23:43:11 GMT-0400 (Eastern Daylight Time)',
        originalPrice: '12',
        categoryName: 'normal'
      }
    const immutable_template_data = [
        { key: 'locationName', value: ['string', template_data_object.locationName] },
        { key: 'name', value: ['string', template_data_object.name] },
        { key: 'originalDateTime', value: [ 'string',template_data_object.originalDateTime,
          ] },
        { key: 'originalPrice', value: ['string', template_data_object.originalPrice] },
        { key: 'categoryName', value: ['string', template_data_object.categoryName] },
    ]

    const createTemplActionData = {
        authorized_creator: userName,
        collection_name: testCollectionName,
        schema_name: 'ticket',
        transferable: true,
        burnable: true,
        max_supply: 0,
        immutable_data: immutable_template_data,
      } as AtomicAssetsCreateTemplActionData

    const createTemplAction = [
        {
          account: atomicAssetUserName,
          name: 'createtempl',
          data: createTemplActionData,
        } as EosTransactionRequestObject,
      ]

    jest.spyOn(appwriteService, 'getTransactionPendingInfo').mockImplementation((transactionPendingId) => 
        Promise.resolve({
        $id: transactionPendingId,
        $collection: '', 
        $read: [''], 
        $write: [''],
        eosUserName: userName, 
        transactionType: TransactionType.CREATE_TICKET,
        expirationDate: new Date().getTime() + 1000,
        data: JSON.stringify([
            {
              account: atomicAssetUserName,
              name: 'createtempl',
              authorization: [],
              data: createTemplActionData,
            } as EosTransactionRequestObject,
        ]) 
    })
    );

    jest.spyOn(atomicAssetsService, 'getTemplates').mockImplementation((collName, templateId, limit, reverse) => 
        Promise.resolve({
            rows: [ { template_id: templateIdExpected,  immutable_serialized_data: template_data_object }, 
                { template_id: 88,  immutable_serialized_data: { dummyProperty1: "test" } }]
        })
    );

    jest.mock("eosjs")
    const { JsonRpc } = require('eosjs')
    const spyPushTransaction = jest.spyOn(JsonRpc.prototype, 'push_transaction').mockImplementation(() => {
        return { transaction_id: transactionId }
    });

    // Create a fake transaction that will be sent as serialized
    const originalTransaction = [
        {
          account: atomicAssetUserName,
          name: 'createtempl',
          authorization: [ ],
          data: {
            authorized_creator: userName,
            collection_name: testCollectionName,
            schema_name: 'ticket',
            transferable: true,
            burnable: true,
            max_supply: 0,
            immutable_data: immutable_template_data
          }
        }
      ]
    var enc = new TextEncoder(); // always utf-8
    var serializedActions = enc.encode(JSON.stringify(originalTransaction));

    const passedBody = {
      transactionId: transactionId,
      signatures: ['SignatureOFTICKET'],
      serializedTransaction: serializedActions,
      transactionType: TransactionType.CREATE_TICKET,
      transactionsBody: createTemplAction,
      userName: userName,
      transactionPendingId: transactionPendingId,
    } as NfticketTransactionObject;

    const responseFromController = await controller.postValidateCreateTicket(passedBody);

    expect(responseFromController.success).toBe(true)
    expect(responseFromController.data).toBeDefined()
    expect(responseFromController.data.templates).toHaveLength(1)
    expect(responseFromController.data.templates).toEqual(
        expect.arrayContaining([
            { ...template_data_object, template_id: templateIdExpected }
        ])
    )
    expect(spyPushTransaction).toBeCalledTimes(1)
    expect(appwriteService.deleteTransactionPendingInfo).toBeCalledTimes(1)
    expect(appwriteService.deleteTransactionPendingInfo).toBeCalledWith(transactionPendingId)
  });
});
