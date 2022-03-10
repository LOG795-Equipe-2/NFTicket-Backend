import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import * as TICKET_SCHEMA from '../schemas/ticketSchema.json'; // this ts file should still be imported fine
import { Logger } from "tslog";

/**
 * Backend class service to send and validate transactions
 * 
 */

import { Injectable } from '@nestjs/common';

export class Ticket {
    asset_id:string | null = null

    eventName:string
    locationName:string
    originalDateTime:string
    originalPrice:number
    categoryName:string
    numberOfTickets:number

    constructor(jsonObject: any){
        this.eventName = jsonObject.eventName
        this.locationName = jsonObject.locationName
        this.originalDateTime = jsonObject.originalDateTime
        this.originalPrice = jsonObject.originalPrice
        this.categoryName = jsonObject.categoryName
        this.numberOfTickets = jsonObject.numberOfTickets
    }

    static getSchemaName(){
        return "ticket"
    }

    static returnTicketSchema(): any{
        return TICKET_SCHEMA
    }
}

@Injectable()
export class NfticketTransactionService {
    log: Logger = new Logger({ name: "NfticketTransactionServiceLogger"})

    blockchainUrl: string
    appName: string
    chainId: string

    atomicAssetContractAccountName: string
    tempAccountOwnerAssets: string

    constructor(private configService: ConfigService, private atomicAssetsService: AtomicAssetsQueryService){
        this.blockchainUrl = configService.get<string>('blockchainNodeUrl')
        this.appName = configService.get<string>('appName')
        this.chainId = configService.get<string>('chainId')
        this.atomicAssetContractAccountName = configService.get<string>('atomicAssetContractAccountName')
        this.tempAccountOwnerAssets = configService.get<string>('tempAccountOwnerAssets')
    }

    getHello(): string {
        return 'Hello World!';
    }

    initiate(): any{
        return {
            blockchainUrl: this.blockchainUrl,
            appName: this.appName,
            chainId: this.chainId
        };
    }

    async createTickets(userName, collName, tickets: Ticket[]) {
        let transactions = [];

        let collResults = await this.atomicAssetsService.getCollections(collName, 1)
        if(collResults.rows.length != 1){
            this.log.info("Collection " + collName + " does not exist on the blockchain. Adding a trx to create it...")
            transactions.push({
                account: this.atomicAssetContractAccountName,
                name: 'createcol',
                data: {
                    author: userName,
                    collection_name: collName,
                    allow_notify: true,
                    authorized_accounts: [userName],
                    notify_accounts: [],
                    market_fee: 0,
                    data: []
                }
            })
        }

        let schemaColl = await this.atomicAssetsService.getSchemas(collName, Ticket.getSchemaName(), 1)
        if(schemaColl.rows.length != 1){
            this.log.info("Schema " + Ticket.getSchemaName() + " does not exist on the blockchain. Adding a trx to create it...")
            transactions.push({
                account: this.atomicAssetContractAccountName,
                name: 'createschema',
                data: {
                    authorized_creator: userName,
                    collection_name: collName,
                    schema_name: Ticket.getSchemaName(),
                    schema_format: Ticket.returnTicketSchema()
                }
            })
        }


        // Every time we create new assets, we will create a new template.
        // We could store the state of the templates, but for now it's easier like that.
        for(let index = 0; index < tickets.length; index++){
            let ticket = tickets[index]

            let nbToCreate: number = ticket.numberOfTickets

            transactions.push({
                account: this.atomicAssetContractAccountName,
                name: 'createtempl',
                data: {
                        authorized_creator: userName,
                        collection_name: collName,
                        schema_name: Ticket.getSchemaName(),
                        transferable: true,
                        burnable: true,
                        max_supply: 0,
                        immutable_data: [
                            {"key": "name", value: ["string", ticket.eventName]},
                            {"key": "locationName", value: ["string", ticket.locationName]},
                            {"key": "originalDateTime", value: ["string", ticket.originalDateTime]},
                        ]
                }
            })

            // Because we want to create all in one transactions, we
            // need to find manually what will be the next template id on the blockchain.
            // We do this by counting the number of templates and adding one.
            // Little hackish for now.
            let nextTemplateId = await this.atomicAssetsService.getTemplatesCount() + 1 + index;
            this.log.info("Next Template Id Result for ticket " + (index+1) +" of trx: " + nextTemplateId);

            for(let i = 0; i < nbToCreate; i++){
                transactions.push({
                    account: this.atomicAssetContractAccountName,
                    name: 'mintasset',
                    data: {
                            authorized_minter: userName,
                            collection_name: collName,
                            schema_name: Ticket.getSchemaName(),
                            template_id: nextTemplateId,
                            new_asset_owner: userName,
                            immutable_data: [
                                {"key": "originalPrice", "value": ["string", ticket.originalPrice]},
                                {"key": "categoryName", "value": ["string", ticket.categoryName]}
                            ],
                            mutable_data: [],
                            tokens_to_back: []
                    }
                })
            }
        }


        return {
            transactionId: null,
            transactionType: 'createTicket',
            transactionsBody: transactions
        };
    }

}
