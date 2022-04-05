import { Controller, Get, Post, Req, Query, Body, UseGuards, ValidationPipe, UsePipes, Delete } from '@nestjs/common';
import { NfticketTransactionService } from './nfticket-transaction.service';
import { TicketsQuery } from '../utilities/TicketObject.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { Logger } from "tslog";
import ApiResponse, { ApiTransactionsActionsResponse } from '../utilities/ApiResponse.dto'
import { AppwriteGuard } from '../appwrite/appwrite.guard';
import { NfticketTransactionObject } from '../utilities/NfticketTransactionObject.dto';

enum TransactionRoutes {
    ACTIONS = "actions",
    VALIDATE = "validate",
    UTILITY = "utility"
}

enum TransactionType{
    CREATE_TICKET = "createTicket",
    BUY_TICKET = "buyTicket",
    SIGN_TICKET = "signTicket",
    CONTROL_TICKET = "controlTicket"
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
    constructor(private readonly nfticketTransactionService: NfticketTransactionService) {}

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
    @Delete(TransactionRoutes.UTILITY + '/deleteAllTransactionsPending')
    deleteAllTransactionsPending(@Query('password') password: string): ApiResponse {
        //TODO: Implement
        return {
            success: false,
            errorMessage: "Not implemented yet"
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
            transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
            if(transactionPendingInfo == null)
                throw Error();
        } catch (err){
            return {
                success: false,
                errorMessage: "The transaction with this TransactionPendingId was never initiated. Initiate a transaction with the /" + TransactionRoutes.ACTIONS + " route"
            }
        }
        
        let isTransactionPendingNotExpired = await this.nfticketTransactionService.validateTransactionPendingDate(transactionValidation.transactionPendingId)
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
            this.log.error("An error has happened while trying to push the transaction to the blockchain: " + err.message)
            return {
                success: false,
                errorMessage: "An error has happened while trying to push the transaction to the blockchain, please retry."
            }
        }
        let templateInformations = await this.nfticketTransactionService.extractTemplateObjectFromTrx(collName, transactionPendingInfo.data)

        // Remove information about the pending transaction to save space in DB.
        await this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
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
    async postValidateBuyTickets(@Body() transactionValidation: NfticketTransactionObject){
        let transactionType = TransactionType.BUY_TICKET;
        this.log.info("New transaction type buyTicket has been correctly registered with following ID: " + transactionValidation.transactionId)

        let transactionPendingInfo = await this.nfticketTransactionService.getTransactionPendingInfo(transactionValidation.transactionPendingId);
        let isTransactionPendingNotExpired = await this.nfticketTransactionService.validateTransactionPendingDate(transactionValidation.transactionPendingId)
        if(!isTransactionPendingNotExpired){
            return {
                success: false,
                errorMessage: "The transaction has expired. Please redo the transaction."
            }
        }

        //Broadcast the transaction to the blockchain
        let broadcasedTransactionId = ''
        try{
            let transactionPushed = await this.nfticketTransactionService.pushTransaction(transactionValidation.signatures, transactionValidation.serializedTransaction)
            broadcasedTransactionId = transactionPushed.transaction_id
        } catch(err){
            //An error happend
            this.log.error("An error has happened while trying to push the transaction to the blockchain: " + err.message)
            return {
                success: false,
                errorMessage: "An error has happened while trying to push the transaction to the blockchain, please retry."
            }
        }

        // Validate that the buy function worked.
        // TODO: review the validation process, since we are now broadcasting the transaction to the blockchain, it might be easier to validate before pushing it.
        let transactionData = transactionPendingInfo['data'][0].data
        let buyTransactionIsValidated = this.nfticketTransactionService.validateBuyOfTicketSucceded(transactionValidation.transactionId, transactionPendingInfo['eosUserName'], transactionData.quantity)
        if(!buyTransactionIsValidated){
            return {
                success: false,
                errorMessage: "The transfer broadcasting failed. Please redo the transaction."
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
        await this.nfticketTransactionService.deleteTransactionPendingInfo(transactionValidation.transactionPendingId)
        return {
            success: true,
            data: { 
               message: "Transfer for ticket " + ticketChoosen['$id'] + " with asset ID: " + ticketChoosen['assetId'] + " has been successfully executed."
            }
        }
    }

    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to sign his ticket.'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'assetId', description: 'The ID of the ticket to sign.'})
    @ApiTags(SwaggerApiTags.ACTIONS)
    @Post(TransactionRoutes.ACTIONS + '/signTicket')
    async postActionsSignTicket(@Body() completeTransaction: any,
            @Query('assetId') assetId: string,
            @Query('userName') userName: string): Promise<ApiResponse>{
        let transactionType = TransactionType.SIGN_TICKET
        let transactions = await this.nfticketTransactionService.createSignTransaction(userName, assetId, completeTransaction)        
        
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

    @ApiOperation({ summary: 'TODO' })
    @ApiTags(SwaggerApiTags.VALIDATE)
    @Post(TransactionRoutes.VALIDATE + '/signTicket')
    async postValidateSignTicket(@Body() transactionValidation: any){
        let transactionType = TransactionType.SIGN_TICKET
        this.log.info("New transaction type signTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
        if(transactionValidation.signedTransactions == '' || transactionValidation.signedTransactions == null){
            return {
                success: false,
                errorMessage: "Error while validating the transactions. Transaction is invalid."
            }
        }
        await this.nfticketTransactionService.pushTransaction(transactionValidation.signedTransactions.signatures, transactionValidation.serializedTransaction)
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
    }

    @ApiOperation({ summary: 'TODO'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'assetId', description: 'The ID of the ticket to sign.'})
    @ApiTags(SwaggerApiTags.ACTIONS)
    @Post(TransactionRoutes.ACTIONS + '/controlTicket')
    async postControlTicket(@Body() completeTransaction: any,
            @Query('assetId') assetId: string,
            @Query('userName') userName: string): Promise<ApiResponse>{
        let transactionType = TransactionType.CONTROL_TICKET
        
        return {
            success: false,
            errorMessage: "Not implemented yet"
        };    
    }

    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to create the templates for ticket catgories', 
    description: 'It will include the transactions to create the schema and collections if they not already on the blockchain.' })
    @ApiTags(SwaggerApiTags.VALIDATE)
    @Post(TransactionRoutes.VALIDATE + '/controlTicket')
    async postValidateControlTicket(@Body() transactionValidation: any){
        let transactionType = TransactionType.CONTROL_TICKET

        return {
            success: false,
            errorMessage: "Not implemented yet"
        }
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

        return {
            success: false,
            errorMessage: "Deprecated route"
        }
    }
}
