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
     * Will create a ticket with specified
     * 
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to create the tickets', 
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
            let ticketTransactions = await this.nfticketTransactionService.createTickets(userName, collName, tickets)
            return ticketTransactions;
        } catch (err){
            return {
                "success": false,
                "errorMessage" : err.message
            }
        }
    }

    @ApiOperation({ summary: 'Inform the backend that a transaction has been correctly signed' })
    @Post('/validateTransaction')
    validateTransactions(@Query('transactionId') transactionId: string,
                            @Query('transactionType') transactionType: string,
                            @Query('transactionsBody') transactionsBody: any[]){
        if(transactionId == '' || transactionId == null ||
            transactionType == '' || transactionType == null ||
            transactionsBody == null || transactionsBody == []){
            return {
                success: "false",
                message: "Error while validating the transactions. Transaction is invalid."
            }
        }
        if(transactionType == 'createTicket'){
            this.log.info("New transaction type createTicket has been correctly registered with following ID: " + transactionId)
            // TODO : Save in some form the transactions of the stuff that were created.
            return {
                success: "true",
                message: "Transaction with ID " + transactionId + " has been successfully validated."
            }
        } else {
            return {
                success: "false",
                message: "Error while validating the transactions. Transaction type is unknown."
            }
        }
    }


}
