import { Controller, Get, Post, Req, Query, Body } from '@nestjs/common';
import { NfticketTransactionService, Ticket } from './nfticket-transaction.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Logger } from "tslog";

@ApiTags('nfticket-transaction')
@Controller('nfticket-transaction')
export class NfticketTransactionController {
    constructor(private readonly nfticketTransactionService: NfticketTransactionService) {}

    log: Logger = new Logger({ name: "NfticketTransactionControllerLogger"})

    @Get()
    getHello(): string {
        return this.nfticketTransactionService.getHello();
    }

    @ApiOperation({ summary: 'Receive parameters to use to connect to the blockchain' })
    @Get('/init')
    getInitiateTransactions(): string {
        return this.nfticketTransactionService.initiate();
    }

    @ApiOperation({ summary: 'Gives the Collection Name that has been assigned to the user.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @Get('/getCollNameForUser')
    getCollNameForUser(@Query('userName') userName: string){
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
                    @Query('userName') userName: string){
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
            return ticketTransactions;
        } catch (err){
            return {
                "success": false,
                "errorMessage" : err.message
            }
        }
    }

    /**
     * Will create a ticket with specified
     * 
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to buy a ticket.'})
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @ApiQuery({ name: 'ticketCategoryId', description: 'The ID of the category to buy a ticket from.'})
    @Get('/buyTicketFromCategory')
    async getBuyTicket(@Query('ticketCategoryId') ticketCategoryId: string,
            @Query('userName') userName: string){
        let transactions = []

        //TODO: Create transactions to create transfer EOS tokens.

        return {
            transactionId: null,
            transactionType: 'createTicket',
            transactionsBody: transactions,
            userName: userName,
            ticketCategoryId: ticketCategoryId
        };    
    }

    @ApiOperation({ summary: 'Inform the backend that a transaction has been correctly signed' })
    @Post('/validateTransaction')
    async postValidateTransactions(@Body() transactionValidation: any){
        if(transactionValidation.transactionId == '' || transactionValidation.transactionId == null ||
            transactionValidation.transactionType == '' || transactionValidation.transactionType == null ||
            transactionValidation.transactionsBody == null || transactionValidation.transactionsBody == [] ||
            transactionValidation.userName == '' || transactionValidation.userName == null){
            return {
                success: "false",
                message: "Error while validating the transactions. Transaction is invalid."
            }
        }

        let collName = this.nfticketTransactionService.getCollNameForUser(transactionValidation.userName)
        if(transactionValidation.transactionType == 'createTicket'){
            this.log.info("New transaction type createTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
            let templateInformations = await this.nfticketTransactionService.validateCreateTicketTemplate(collName, transactionValidation.transactionsBody)
            return {
                success: "true",
                message: "Transaction with ID " + transactionValidation.transactionId + " has been successfully validated.",
                templates: templateInformations
            }
        } else if(transactionValidation.transactionType == 'buyTicket'){
            this.log.info("New transaction type buyTicket has been correctly registered with following ID: " + transactionValidation.transactionId)
            if(transactionValidation.ticketCategoryId == '' || transactionValidation.ticketCategoryId == null){
                return {
                    success: "false",
                    message: "Error while validating the transactions. Transaction is invalid."
                }
            }
            //TODO: Add a validation that will allow to confirm the payment (either EOS or cash) has been done before transfering the tickets.
            let ticketChoosen = await this.nfticketTransactionService.validateTicketBuy(transactionValidation.ticketCategoryId, transactionValidation.userName);
            return {
                success: "true",
                message: "Transfer for ticket " + ticketChoosen.$id + " with asset ID: " + ticketChoosen.assetId + " has been successfully executed."
            }
        } else {
            return {
                success: "false",
                message: "Error while validating the transactions. Transaction type is unknown."
            }
        }
    }
}
