import { Controller, Get, Post, Req, Query, Body, UseGuards, ValidationPipe, UsePipes, Delete, Headers } from '@nestjs/common';
import { NfticketTransactionService } from './nfticket-transaction.service';
import { TicketsQuery } from '../utilities/TicketObject.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { Logger } from "tslog";
import ApiResponse, { ApiTransactionsActionsResponse } from '../utilities/ApiResponse.dto'
import { AppwriteGuard } from '../appwrite/appwrite.guard';
import { NfticketTransactionObject } from '../utilities/NfticketTransactionObject.dto';
import { TransactionType } from '../utilities/NfticketTransactionType';
import { ConfigService } from '@nestjs/config';

enum TransactionRoutes {
    ACTIONS = "actions",
    VALIDATE = "validate",
    UTILITY = "utility"
}

enum SwaggerApiTags{
    ACTIONS = "actions",
    VALIDATE = "action validation",
    UTILITY = "utility"
}

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(AppwriteGuard)
@ApiHeader({
    name: 'nfticket-appwrite-jwt',
    description: 'JWT token from Appwrite',
  })
export class NfticketTransactionController {
    constructor(private readonly nfticketTransactionService: NfticketTransactionService,
        private configService: ConfigService) {}

    log: Logger = new Logger({ name: "NfticketTransactionControllerLogger"})

    @ApiOperation({ summary: 'Receive parameters to use to connect to the blockchain' })
    @ApiTags(SwaggerApiTags.UTILITY)
    @Get(TransactionRoutes.UTILITY + '/init')
    getInitiateTransactions(): ApiResponse {
        return {
            success: true,
            data: this.nfticketTransactionService.initiate()
        };
    }

    @ApiOperation({ summary: 'Gives the Collection Name that has been assigned to the user.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiTags(SwaggerApiTags.UTILITY)
    @Get(TransactionRoutes.UTILITY + '/getCollNameForUser')
    getCollNameForUser(@Query('userName') userName: string): ApiResponse{
        return {
            success: true,
            data: this.nfticketTransactionService.getCollNameForUser(userName)
        };
    }

    @ApiOperation({ summary: 'Receive parameters to use to connect to the blockchain' })
    @ApiTags(SwaggerApiTags.UTILITY)
    @Delete(TransactionRoutes.UTILITY + '/deleteTransactionsPendingExpired')
    async deleteAllTransactionsPending(@Headers('X-Appwrite-Project') appwriteProjectId: string, @Headers('X-Appwrite-Key') appwriteAdminKey: string): Promise<ApiResponse> {
        if(typeof appwriteProjectId === "undefined" || appwriteProjectId !== this.configService.get<string>('appwriteProjectId')
            || typeof appwriteAdminKey === "undefined" || appwriteAdminKey !== this.configService.get<string>('appwriteSecret')){
            return {
                success: false,
                errorMessage: "Invalid credentials"
            }
        }
        let deletedDocuments = await this.nfticketTransactionService.deleteAllExpiredTransactionsPending()
        return {
            success: true,
            errorMessage: deletedDocuments.length + " expired transactions pending deleted. More might remain."
        };
    }

    /**
     * Will create a ticket template with specified data.
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to create the templates for ticket catgories', 
                    description: 'It will include the transactions to create the schema and collections if they not already on the blockchain.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiTags(SwaggerApiTags.ACTIONS)
    @Post(TransactionRoutes.ACTIONS + '/createTickets')
    @UsePipes(new ValidationPipe({ transform: false }))
    async postActionsCreateTicket(@Body() ticketsReq: TicketsQuery,
                    @Query('userName') userName: string): Promise<ApiTransactionsActionsResponse>{
        let transactionType = TransactionType.CREATE_TICKET;
        let collName = this.nfticketTransactionService.getCollNameForUser(userName)
        try{
            let ticketTransactions = await this.nfticketTransactionService.createTicketCategoryTemplate(userName, collName, ticketsReq.tickets)
            let transactionPendingId = await this.nfticketTransactionService.createTransactionPending(userName, transactionType, JSON.stringify(ticketTransactions))
            return {
                success: true,
                data: {
                    transactionId: null,
                    transactionPendingId: transactionPendingId,
                    transactionType: transactionType,
                    transactionsBody: ticketTransactions,
                    userName: userName
                }
            };            
        } catch (err){
            this.log.error(err)
            return {
                success: false,
                errorMessage : err.message
            }
        }
    }

    /**
     * Will create a ticket template with specified data.
     * 
     */
    @ApiOperation({ summary: 'Broadcast the transactions that the user sign to create the templates for ticket catgories' })
    @UsePipes(new ValidationPipe())
    @ApiTags(SwaggerApiTags.VALIDATE)
    @Post(TransactionRoutes.VALIDATE + '/createTickets')
    async postValidateCreateTicket(@Body() transactionValidation: NfticketTransactionObject): Promise<ApiResponse>{
        let transactionType = TransactionType.CREATE_TICKET;
        let collName = this.nfticketTransactionService.getCollNameForUser(transactionValidation.userName)

        let transactionPendingInfo = null;
        try{
            // Get TransactionPendingInfo returns an error if no entry was found
            transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
            if(transactionPendingInfo.data == null)
                throw Error();
        } catch (err){
            return {
                success: false,
                errorMessage: "The transaction with this TransactionPendingId was never initiated. Initiate a transaction with the /" + TransactionRoutes.ACTIONS + " route"
            }
        }
        
        let isTransactionPendingNotExpired = await this.nfticketTransactionService.validateTransactionPendingDate(transactionPendingInfo)
        if(!isTransactionPendingNotExpired){
            // Remove information about the pending transaction to save space in DB.
            this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
            return {
                success: false,
                errorMessage: "The transaction has expired. Please redo the transaction."
            }
        }
        // Extract transactions Informations
        const transactionActions = await this.nfticketTransactionService.deserializeTransactionsActions(transactionValidation.serializedTransaction)

        // Compare the informations to make sure they are the same
        let areTransactionActionsEquals = await this.nfticketTransactionService.validateTransactionActionsEquals(transactionPendingInfo.data, transactionActions)
        if(!areTransactionActionsEquals){
            // Remove information about the pending transaction to save space in DB.
            this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
            return {
                success: false,
                errorMessage: "Both transactions are not equal. Pending Transaction is cancelled. Please redo the transaction."
            }
        }

        //Broadcast the transaction to the blockchain
        try{
            await this.nfticketTransactionService.pushTransaction(transactionValidation.signatures, transactionValidation.serializedTransaction)
        } catch(err){
            //An error happend
            let message = "An error has happened while trying to push the transaction to the blockchain"
            this.log.error(message + ": " + err.message)
            return {
                success: false,
                errorMessage: message + ", please retry."
            }
        }
        let templateInformations = await this.nfticketTransactionService.extractTemplateObjectFromTrx(collName, transactionPendingInfo.data)

        // Remove information about the pending transaction to save space in DB.
        this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
        return {
            success: true,
            data: {
                message: "Transaction with ID " + transactionValidation.transactionId + " has been successfully broadcasted and validated.",
                templates: templateInformations,
                collName: collName //TODO: After buy Ticket revamp, check if we still need to pass this parameter through the front and the backend.
            }
        }
    }

    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to buy a ticket.'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'ticketCategoryId', description: 'The ID of the category to buy a ticket from.'})
    @ApiTags(SwaggerApiTags.ACTIONS)
    @UsePipes(new ValidationPipe())
    @Post(TransactionRoutes.ACTIONS + '/buyTickets')
    async postActionsBuyTicket(@Query('ticketCategoryId') ticketCategoryId: string,
            @Query('userName') userName: string): Promise<ApiTransactionsActionsResponse>{
        let transactionType = TransactionType.BUY_TICKET;
        
        // Check first if there are tickets remaining.
        let ticketsRemaining = await this.nfticketTransactionService.getRemainingTickets(ticketCategoryId);
        if(!ticketsRemaining || ticketsRemaining.length <= 0){
            return {
                success: false,
                errorMessage: "There are no tickets remaining for this category"
            }
        }
        // Reserve the ticket in the DB
        let reservedTime = 5 * 60
        let choosenTicket = await this.nfticketTransactionService.chooseTicketAndReserve(ticketsRemaining, reservedTime);

        // Create the transaction
        let transactions = await this.nfticketTransactionService.createBuyTransaction(userName, ticketCategoryId)

        // Create the pending transaction
        // Send the chosenTicketId in the transactionPending to get it later
        let transactionPendingId = await this.nfticketTransactionService.createTransactionPending(userName, 
            transactionType, 
            JSON.stringify({
                ...transactions, 
                choosenTicketId: choosenTicket.$id
        }))

        return {
            success: true,
            data: {
                transactionId: null,
                transactionType: transactionType,
                transactionsBody: transactions,
                userName: userName,
                transactionPendingId: transactionPendingId
            }
        };    
    }

    /**
     * Will buy the ticket for the user.
    */
    @ApiOperation({ summary: 'Save the buying transactions for the tickets specified and saves the elements in the database' })
    @ApiTags(SwaggerApiTags.VALIDATE)
    @UsePipes(new ValidationPipe())
    @Post(TransactionRoutes.VALIDATE + '/buyTickets')
    async postValidateBuyTickets(@Body() transactionValidation: NfticketTransactionObject): Promise<ApiResponse>{
        let transactionType = TransactionType.BUY_TICKET;
        this.log.info("Entering into postValidateBuyTickets");

        let transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
        let isTransactionPendingNotExpired = await this.nfticketTransactionService.validateTransactionPendingDate(transactionPendingInfo)
        if(!isTransactionPendingNotExpired){
            this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
            return {
                success: false,
                errorMessage: "The transaction has expired. Please redo the transaction."
            }
        }

        // Validate that the buy function worked.
        let transactionData = transactionPendingInfo['data'][0].data
        let buyTransactionIsValidated = this.nfticketTransactionService.validateBuyTicketsSignedTransaction(transactionValidation.signatures, transactionPendingInfo['eosUserName'], transactionValidation.serializedTransaction, transactionData.quantity)
        if(!buyTransactionIsValidated){
            return {
                success: false,
                errorMessage: "The transfer broadcasting failed. Please redo the transaction."
            }
        }

        // Broadcast the transaction to the blockchain
        try{
            await this.nfticketTransactionService.pushTransaction(transactionValidation.signatures, transactionValidation.serializedTransaction)
        } catch(err){
            //An error happend
            this.log.error("An error has happened while trying to push the transaction to the blockchain: " + err.message)
            return {
                success: false,
                errorMessage: "An error has happened while trying to push the transaction to the blockchain, please retry."
            }
        }

        let ticketChoosen
        try{
            //TODO: Normalize the transactionPendingInfo from Appwrite.
            let choosenTicketId = transactionPendingInfo['data'].choosenTicketId
            ticketChoosen = await this.nfticketTransactionService.validateTicketBuy(choosenTicketId, transactionValidation.userName);    
        } catch(err){
            return {
                success: false,
                errorMessage: "The transfer and saving of your bought ticket has failed. Please retry."
            }
        }

        // Remove information about the pending transaction to save space in DB.
        this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
        return {
            success: true,
            data: { 
               message: "Transfer for ticket " + ticketChoosen['$id'] + " with asset ID: " + ticketChoosen['assetId'] + " has been successfully executed."
            }
        }
    }

    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to prove his identity, so that the backend will sign the ticket.'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'assetId', description: 'The ID of the ticket to sign.'})
    @ApiTags(SwaggerApiTags.ACTIONS)
    @Post(TransactionRoutes.ACTIONS + '/signTicket')
    async postActionsSignTicket(@Query('assetId') assetId: string,
            @Query('userName') userName: string): Promise<ApiTransactionsActionsResponse>{
        if(typeof assetId !== 'string' || assetId == null || 
            typeof userName !== 'string' || userName == null){
            return {
                success: false,
                errorMessage: "The assetId is required."
            }
        }
        let transactionType = TransactionType.SIGN_TICKET

        // Create the transaction
        let transactions = await this.nfticketTransactionService.createSignTransaction(userName, assetId)        
        
        // Validate that the user possess the ticket
        let userHasTicket = await this.nfticketTransactionService.validateUserHasTicket(assetId, userName)
        if(!userHasTicket){
            return {
                success: false,
                errorMessage: "You don't have the ticket with asset ID: " + assetId
            }
        }

        // Create the pending transaction
        // Send the assetId of the ticket that should be signed in the transactionPending to get it later
        let transactionPendingId = await this.nfticketTransactionService.createTransactionPending(userName, 
            transactionType, 
            JSON.stringify({
                ...transactions, 
                assetId: assetId
        }))
        return {
            success: true,
            data: {
                transactionId: null,
                transactionType: transactionType,
                transactionsBody: transactions,
                userName: userName,
                transactionPendingId: transactionPendingId
            }
        };    
    }

    @ApiOperation({ summary: 'Check that the transaction was validated by the user, and sign the ticket on the blockchain.',
        description: 'Signing the ticket on the blockchain means changing the value of the property \'signed\' on the NFT.' })
    @ApiTags(SwaggerApiTags.VALIDATE)
    @UsePipes(new ValidationPipe())
    @Post(TransactionRoutes.VALIDATE + '/signTicket')
    async postValidateSignTicket(@Body() transactionValidation: NfticketTransactionObject){
        let transactionType = TransactionType.SIGN_TICKET
        this.log.info("Entering into postValidateSignTicket");
        
        let transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
        let isTransactionPendingNotExpired = await this.nfticketTransactionService.validateTransactionPendingDate(transactionPendingInfo)
        if(!isTransactionPendingNotExpired){
            this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
            return {
                success: false,
                errorMessage: "The transaction has expired. Please redo the transaction."
            }
        }
        let userName = transactionPendingInfo['eosUserName'];
        let assetId = transactionPendingInfo['data'].assetId;

        // Validate that the user still possesses the ticket
        let userHasTicket = await this.nfticketTransactionService.validateUserHasTicket(assetId, userName)
        if(!userHasTicket){
            return {
                success: false,
                errorMessage: "You don't have the ticket with asset ID: " + assetId
            }
        }

        // Validate that the test transaction was signed correctly.
        let verificationComplete = await this.nfticketTransactionService.validateTicketSign(transactionValidation.signatures, transactionValidation.userName, transactionValidation.serializedTransaction)
        console.log(verificationComplete)
        if(!verificationComplete){
            return {
                success: false,
                errorMessage: "The transaction could not be verified. Please redo the transaction with the good signature."
            }
        }
        
        //Actually signed the ticket on the blockchain.
        try{
            await this.nfticketTransactionService.signTicketOnBlockchain(assetId, userName)
        } catch(err){
            this.log.error(err)
            return {
                success: false,
                errorMessage: "An error has happened while trying to sign the ticket, please retry."
            }
        }

        // Remove information about the pending transaction to save space in DB.
        this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
        return {
            success: true,
            data: transactionValidation
        }
    }

    @ApiOperation({ summary: 'Inform the backend that a transaction has been correctly signed' })
    @Post('/validateTransaction')
    async postValidateTransactions(@Body() transactionValidation: any): Promise<ApiResponse>{
        return {
            success: false,
            errorMessage: "Deprecated route"
        }
    }
}
