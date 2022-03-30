import { Controller, Get, Post, Req, Query, Body } from '@nestjs/common';
import { NfticketTransactionService, Ticket } from './nfticket-transaction.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Logger } from "tslog";
import ApiResponse from '../utilities/ApiResponse'

@ApiTags('nfticket-transaction')
@Controller('nfticket-transaction')
export class NfticketTransactionController {
    constructor(private readonly nfticketTransactionService: NfticketTransactionService) {}

    log: Logger = new Logger({ name: "NfticketTransactionControllerLogger"})

    @ApiOperation({ summary: 'Receive parameters to use to connect to the blockchain' })
    @Get('/init')
    getInitiateTransactions(): ApiResponse {
        return {
            success: true,
            data: this.nfticketTransactionService.initiate()
        };
    }

    @ApiOperation({ summary: 'Gives the Collection Name that has been assigned to the user.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @Get('/getCollNameForUser')
    getCollNameForUser(@Query('userName') userName: string): ApiResponse{
        return {
            success: true,
            data: this.nfticketTransactionService.getCollNameForUser(userName)
        };
    }

    /**
     * Will create a ticket template with specified data.
     * 
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to create the templates for ticket catgories', 
                    description: 'It will include the transactions to create the schema and collections if they not already on the blockchain.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @Post('/createTickets')
    async getCreateTicket(@Body() ticketsReq: Ticket[],
                    @Query('userName') userName: string): Promise<ApiResponse>{
        //TODO: Implement user validation

        let collName = this.nfticketTransactionService.getCollNameForUser(userName)
                    
        let tickets:Ticket[] = []
        ticketsReq.forEach((ticketToCreate) => {
            let ticket:Ticket = new Ticket(ticketToCreate);
            tickets.push(ticket)
        })

        // TODO: If there is a error relative to the templateId, we should make sure to
        // retry and/or catch it specifically.
        try{
            let ticketTransactions = await this.nfticketTransactionService.createTicketCategoryTemplate(userName, collName, tickets)
            return {
                success: true,
                data: {
                    transactionId: null,
                    transactionType: 'createTicket',
                    transactionsBody: ticketTransactions,
                    userName: userName,
                    collName: collName
                }
            };            
        } catch (err){
            return {
                success: false,
                errorMessage : err.message
            }
        }
    }

    /**
     * Will create a ticket with specified category Id.
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to buy a ticket.'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'ticketCategoryId', description: 'The ID of the category to buy a ticket from.'})
    @Get('/buyTicketFromCategory')
    async getBuyTicket(@Query('ticketCategoryId') ticketCategoryId: string,
            @Query('userName') userName: string): Promise<ApiResponse>{

        let ticketsRemaining = await this.nfticketTransactionService.checkIfTicketRemaining(ticketCategoryId);
        if(!ticketsRemaining){
            return {
                success: false,
                errorMessage: "There are no tickets remaining for this category"
            }
        }
        let transactions = await this.nfticketTransactionService.createBuyTransaction(userName, ticketCategoryId)
        let transactionType = 'buyTicket'
        let transactionPendingId = await this.nfticketTransactionService.createTransactionPending(userName, transactionType, JSON.stringify(transactions))

        return {
            success: true,
            data: {
                transactionId: null,
                transactionType: transactionType,
                transactionsBody: transactions,
                userName: userName,
                ticketCategoryId: ticketCategoryId,
                transactionPendingId: transactionPendingId
            }
        };    
    }

     @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to sign his ticket.'})
     @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
     @ApiQuery({ name: 'assetId', description: 'The ID of the ticket to sign.'})
     @Get('/signTicket')
     async getSignTicket(@Body() completeTransaction: any,
                @Query('assetId') assetId: string,
             @Query('userName') userName: string): Promise<ApiResponse>{
         let transactions = await this.nfticketTransactionService.createSignTransaction(userName, assetId, completeTransaction)
         let transactionType = 'signTicket'
            
         return {
             success: true,
             data: {
                transactionId: null,
                transactionType: transactionType,
                transactionsBody: transactions,
                userName: userName
             }
         };    
     }

    @ApiOperation({ summary: 'Inform the backend that a transaction has been correctly signed' })
    @Post('/validateTransaction')
    async postValidateTransactions(@Body() transactionValidation: any): Promise<ApiResponse>{
        if(transactionValidation.transactionId == '' || transactionValidation.transactionId == null ||
            transactionValidation.transactionType == '' || transactionValidation.transactionType == null ||
            transactionValidation.transactionsBody == null || transactionValidation.transactionsBody == [] ||
            transactionValidation.userName == '' || transactionValidation.userName == null){
            return {
                success: false,
                errorMessage: "Error while validating the transactions. Transaction is invalid. Possible invalid fields: transactionId, transactionType, transactionsBody, userName"
            }
        }

        let collName = this.nfticketTransactionService.getCollNameForUser(transactionValidation.userName)
        if(transactionValidation.transactionType == 'createTicket'){
            this.log.info("New transaction type createTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
            let templateInformations = await this.nfticketTransactionService.validateCreateTicketTemplate(collName, transactionValidation.transactionsBody)
            return {
                success: true,
                data: {
                    message: "Transaction with ID " + transactionValidation.transactionId + " has been successfully validated.",
                    templates: templateInformations,
                    collName: collName
                }
            }
        } else if(transactionValidation.transactionType == 'buyTicket'){
            this.log.info("New transaction type buyTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
            if(transactionValidation.ticketCategoryId == '' || transactionValidation.ticketCategoryId == null,
                transactionValidation.transactionPendingId == '' || transactionValidation.transactionPendingId == null){
                return {
                    success: false,
                    errorMessage: "Error while validating the transactions. Transaction is invalid."
                }
            }

            let transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
            let expirationDate = transactionPendingInfo['expirationDate'] as number;

            let dateNow = new Date().getTime()
            if(expirationDate < dateNow){
                return {
                    success: false,
                    errorMessage: "The transaction has expired. Please redo the transaction."
                }
            }

            let transactionData = transactionPendingInfo['data'][0].data
            let buyTransactionIsValidated = this.nfticketTransactionService.validateBuyOfTicketSucceded(transactionValidation.transactionId, transactionPendingInfo['eosUserName'], transactionData.quantity)
            if(!buyTransactionIsValidated){
                return {
                    success: false,
                    errorMessage: "The transfer was not correctly made. Please redo the transaction and follow the instructions"
                }
            }

            let ticketChoosen = await this.nfticketTransactionService.validateTicketBuy(transactionValidation.ticketCategoryId, transactionValidation.userName);
            if(ticketChoosen.success == false){
                return ticketChoosen;
            }
            
            // Remove information about the pending transaction to save space in DB.
            await this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)

            return {
                success: true,
                data: { 
                    message: "Transfer for ticket " + ticketChoosen.$id + " with asset ID: " + ticketChoosen.assetId + " has been successfully executed."
                }
            }
        } else if (transactionValidation.transactionType == 'signTicket'){
            this.log.info("New transaction type signTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
            if(transactionValidation.signedTransactions == '' || transactionValidation.signedTransactions == null){
                return {
                    success: false,
                    errorMessage: "Error while validating the transactions. Transaction is invalid."
                }
            }
            let verificationComplete = await this.nfticketTransactionService.validateTicketSign(transactionValidation.signedTransactions, transactionValidation.userName, transactionValidation.serializedTransaction)
            
            if(!verificationComplete){
                return {
                    success: false,
                    errorMessage: "The transaction could not be verified. Please redo the transaction with the good signature."
                }
            }

            //TODO: Validate that the asset is owned by the user that signed the trx.
            //TODO: Actually signed the ticket on the blockchain.
            return {
                success: true,
                data: transactionValidation
            }
        } else {
            return {
                success: false,
                errorMessage: "Error while validating the transactions. Transaction type is unknown."
            }
        }
    }
}
