import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionController } from './nfticket-transaction.controller';
import { NfticketTransactionModule } from './nfticket-transaction.module';
import { NfticketTransactionService } from './nfticket-transaction.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { TransactionType } from '../utilities/NfticketTransactionType';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryServiceTestProvider } from './DTO/AtomicAssetsQueryServiceTestProvider';
import { AppwriteServiceTestProvider } from '../appwrite/DTO/AppwriteServiceTestProvider';
import { PerformanceAnalyserService } from '../performance-analyser/performance-analyser.service';
import { TicketCategoryModel, TicketModel, TransactionsPendingModel } from 'src/interface/appwrite.model';

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

    describe('Buy ticket transaction for the first part (before signing)', () => {
        it('should return return an error if there are no tickets available', async () => {
            const ticketCategoryId = "gjh4738ng58u34h"
            const userName = "testUsername"
            jest.spyOn(appwriteService, 'getTicketsAvailable').mockImplementation((ticketCategoryId) =>
                Promise.resolve([])
            );

            const responseFromController = await controller.postActionsBuyTicket(ticketCategoryId, userName);
            expect(responseFromController.success).toBe(false)
            expect(responseFromController.errorMessage).toContain("no tickets remaining")
        });

        it('should reserve the ticket and send transactions to sign in order to buy the ticket', async () => {
            const ticketCategoryId = "gjh4738ng58u34h"
            const transactionPendingIdExpected = "gfdg45grew4645wds"
            const collectionName = "testCollectn"
            const userName = "testUsername"
            const ticketCategoryObject = {
                $id: ticketCategoryId,
                name: "normal",
                price: 10,
                stylingId: "y5hg43ggg542",
                eventId: "g4537t9hghg9345h",
                initialQuantity: 10,
                remainingQuantity: 10,
                atomicTemplateId: 1
            } as TicketCategoryModel
            jest.spyOn(appwriteService, 'getTicketsAvailable').mockImplementation((ticketCategoryId) =>
                Promise.resolve([ticketCategoryObject])
            );
            jest.spyOn(appwriteService, 'createTransactionPending').mockImplementation(() =>
                Promise.resolve({
                    $id: transactionPendingIdExpected,
                    $collection: '',
                    $read: [''],
                    $write: ['']
                })
            );
            jest.spyOn(appwriteService, 'getTicketCategory').mockImplementation(() =>
                Promise.resolve(ticketCategoryObject)
            );

            jest.spyOn(appwriteService, 'updateTicket');

            const expectedTransactionTransferAction = {
                "account": "eosio.token", 
                "data": {
                    "from": "testUsername", 
                    "memo": "Buying a ticket for an event with ID: g4537t9hghg9345h and ticket category ID: gjh4738ng58u34hon NFTicket platform.", 
                    "quantity": "10.0000 SYS", 
                    "to": "nfticket"
                }, 
                "name": "transfer"
            }

            const responseFromController = await controller.postActionsBuyTicket(ticketCategoryId, userName);
            expect(responseFromController.success).toBe(true)
            expect(appwriteService.updateTicket).toBeCalledTimes(1)

            expect(responseFromController.data.userName).toBe(userName)
            expect(responseFromController.data.transactionType).toBe(TransactionType.BUY_TICKET)
            expect(responseFromController.data.transactionPendingId).toBe(transactionPendingIdExpected)
            expect(responseFromController.data.transactionsBody).toHaveLength(1)
            expect(responseFromController.data.transactionsBody).toEqual(
                expect.arrayContaining([expectedTransactionTransferAction])
            )
        });

        it('should return return an error if there are no tickets available', async () => {
            const ticketCategoryId = "gjh4738ng58u34h"
            const userName = "testUsername"
            jest.spyOn(appwriteService, 'getTicketsAvailable').mockImplementation((ticketCategoryId) =>
                Promise.resolve([])
            );

            const responseFromController = await controller.postActionsBuyTicket(ticketCategoryId, userName);
            expect(responseFromController.success).toBe(false)
            expect(responseFromController.errorMessage).toContain("no tickets remaining")
        });

        it('should reserve the ticket and send no transactions to sign since it\'s free', async () => {
            const ticketCategoryId = "gjh4738ng58u34h"
            const transactionPendingIdExpected = "gfdg45grew4645wds"
            const userName = "testUsername"
            const ticketCategoryObject = {
                $id: ticketCategoryId,
                name: "normal",
                price: 0,
                stylingId: "y5hg43ggg542",
                eventId: "g4537t9hghg9345h",
                initialQuantity: 10,
                remainingQuantity: 10,
                atomicTemplateId: 1
            } as TicketCategoryModel
            jest.spyOn(appwriteService, 'getTicketsAvailable').mockImplementation((ticketCategoryId) =>
                Promise.resolve([ticketCategoryObject])
            );
            jest.spyOn(appwriteService, 'createTransactionPending').mockImplementation(() =>
                Promise.resolve({
                    $id: transactionPendingIdExpected,
                    $collection: '',
                    $read: [''],
                    $write: ['']
                })
            );
            jest.spyOn(appwriteService, 'getTicketCategory').mockImplementation(() =>
                Promise.resolve(ticketCategoryObject)
            );

            jest.spyOn(appwriteService, 'updateTicket');

            const responseFromController = await controller.postActionsBuyTicket(ticketCategoryId, userName);
            expect(responseFromController.success).toBe(true)
            expect(appwriteService.updateTicket).toBeCalledTimes(1)

            expect(responseFromController.data.userName).toBe(userName)
            expect(responseFromController.data.transactionType).toBe(TransactionType.BUY_TICKET)
            expect(responseFromController.data.transactionPendingId).toBe(transactionPendingIdExpected)
            expect(responseFromController.data.transactionsBody).toHaveLength(0)
        });

    });
});
