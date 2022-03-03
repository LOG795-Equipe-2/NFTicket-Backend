import { Controller, Get, Post, Req, Query } from '@nestjs/common';
import { NfticketTransactionService, Ticket } from './nfticket-transaction.service';
import { Request } from 'express';
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

    /**
     * Will create a ticket with specified
     * 
     * 
     */
    @ApiOperation({ summary: 'Create the transactions that the user have to sign in order to create the tickets', 
                    description: 'It will include the transactions to create the schema and collections if they not already on the blockchain.' })
    @ApiQuery({ name: 'userName', description: 'Name of EOS account on the blockchain.'})
    @Get('/createTickets')
    getCreateTicket(@Query('userName') userName: string,
                    @Query('eventName') eventName: string,
                    @Query('locationName') locationName: string,
                    @Query('originalDateTime') originalDateTime: string,
                    @Query('originalPrice') originalPrice: number,
                    @Query('categoryName') categoryName: string){
        //TODO: Implement user validation

        let collName = 'nftikanthynx'
        
        let ticket:Ticket = new Ticket(
            eventName as string,
            locationName as string,
            originalDateTime as string,
            Number(originalPrice),
            categoryName as string
        );

        // TODO: If there is a error relative to the templateId, we should make sure to
        // retry and/or catch it specifically.
        return this.nfticketTransactionService.createTickets(userName, collName, 1, ticket);
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
