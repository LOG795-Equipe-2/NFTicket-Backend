import { Controller, Get, Post, Req } from '@nestjs/common';
import { NfticketTransactionService, Ticket } from './nfticket-transaction.service';
import { Request } from 'express';

@Controller('nfticket-transaction')
export class NfticketTransactionController {
    constructor(private readonly nfticketTransactionService: NfticketTransactionService) {}

    @Get()
    getHello(): string {
        return this.nfticketTransactionService.getHello();
    }

    @Get('/init')
    getInitiateTransactions(): string {
        return this.nfticketTransactionService.initiate();
    }

    /**
     * Will create a ticket with specified
     * 
     * 
     */
    @Get('/createTickets')
    getCreateTicket(@Req() request: Request){
        let userName = request.query.userName

        //TODO: Implement user validation

        let collName = 'nftikanthynu'

        let ticket:Ticket = new Ticket(
            request.query.eventName as string,
            request.query.date as string,
            request.query.hour as string,
            request.query.rowNo as string,
            request.query.seatNo as string,

            request.query.locationName as string,
            request.query.eventName as string
        );

        // TODO: If there is a error relative to the templateId, we should make sure to
        // retry and/or catch it specifically.
        return this.nfticketTransactionService.createTickets(userName, collName, 1, ticket);
    }

    @Post('/validateTransaction')
    validateTransactions(@Req() request: Request){
        let transactionId = request.body.transactionId
        let transactionType = request.body.transactionType
        let transactionsBody = request.body.transactionsBody

        if(transactionId == '' || transactionId == null ||
            transactionType == '' || transactionType == null ||
            transactionsBody == null || transactionsBody == []){
            return {
                success: "false",
                message: "Error while validating the transactions. Transaction is invalid."
            }
        }
        if(transactionType == 'createTicket'){
            console.log("New transaction type createTicket has been correctly registered with following ID: " + transactionId)
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
