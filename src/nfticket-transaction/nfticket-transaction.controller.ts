import { Controller, Get, Req } from '@nestjs/common';
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
        console.log(request.query)
        let userName = request.query.userName

        //TODO: Implement user validation

        let collName = 'nftikanthyn'

        let ticket:Ticket = new Ticket(
            request.query.eventName as string,
            request.query.eventDate as string,
            request.query.eventHour as string,
            request.query.rowNo as string,
            request.query.seatNo as string,

            request.query.locationName as string,
            request.query.eventName as string
        );

        // TODO: If there is a error relative to the templateId, we should make sure to
        // retry and/or catch it specifically.
        return this.nfticketTransactionService.createTickets(userName, collName, 1, ticket);
    }


}
