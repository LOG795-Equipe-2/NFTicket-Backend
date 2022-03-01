import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';

/**
 * Backend class service to send and validate transactions
 * 
 */

import { Injectable } from '@nestjs/common';

export class Ticket {
    asset_id:string | null = null
    name:string
    date:string
    hour:string
    rowNo:string
    seatNo:string

    locationName:string
    eventName:string

    constructor(name:string, date:string, hour:string, rowNo:string, seatNo:string, locationName:string, eventName:string){
        this.name = name;
        this.date = date
        this.hour = hour
        this.rowNo = rowNo;
        this.seatNo = seatNo;
        this.locationName = locationName;
        this.eventName = eventName
    }

    getSchemaName(){
        return "ticket"
    }

    returnPropertiesAsAttributeMap(): any{
        return [
            {"name": "name", "type": "string" },
            {"name": "date", "type": "string"},
            {"name": "hour", "type": "string"},
            {"name": "locationName", "type": "string"},
            {"name": "eventName", "type": "string"},
            {"name": "rowNo", "type": "string"},
            {"name": "seatNo", "type": "string"}
        ]
    }
}

@Injectable()
export class NfticketTransactionService {
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

    async createTickets(userName, collName, nbToCreate:number, ticket: Ticket) {
        let transactions = [];

        let collResults = await this.atomicAssetsService.getCollections(collName, 1)
        console.log("Get Collections results: ");
        console.log(collResults.rows)
        if(collResults.rows.length != 1){
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

        let schemaColl = await this.atomicAssetsService.getSchemas(collName, ticket.getSchemaName(), 1)
        console.log("Get Schemas results: ");
        console.log(schemaColl.rows)
        if(collResults.rows.length != 1){
            transactions.push({
                account: this.atomicAssetContractAccountName,
                name: 'createschema',
                data: {
                    authorized_creator: userName,
                    collection_name: collName,
                    schema_name: ticket.getSchemaName(),
                    schema_format: ticket.returnPropertiesAsAttributeMap()
                }
            })
        }

        // Because we want to create all in one transactions, we
        // need to find manually what will be the next template id on the blockchain.
        // We do this by counting the number of templates and adding one.
        // Little hackish for now.
        let nextTemplateId = await this.atomicAssetsService.getTemplatesCount() + 1;
        console.log("Next Template Id Result: " + nextTemplateId);

        // Every time we create new assets, we will create a new template.
        // We could store the state of the templates, but for now it's easier like that.
        transactions.push({
            account: this.atomicAssetContractAccountName,
            name: 'createtempl',
            data: {
                    authorized_creator: userName,
                    collection_name: collName,
                    schema_name: ticket.getSchemaName(),
                    transferable: true,
                    burnable: true,
                    max_supply: 0,
                    immutable_data: [
                        {"key": "locationName", value: ["string", ticket.locationName]},
                        {"key": "eventName", value: ["string", ticket.eventName]}
                    ]
            }
        })

        for(let i = 0; i < nbToCreate; i++){
            transactions.push({
                account: this.atomicAssetContractAccountName,
                name: 'mintasset',
                data: {
                        authorized_minter: userName,
                        collection_name: collName,
                        schema_name: ticket.getSchemaName(),
                        template_id: nextTemplateId,
                        new_asset_owner: this.tempAccountOwnerAssets,
                        immutable_data: [
                            {"key": "name", "value": ["string", ticket.name]},
                            {"key": "date", "value": ["string", ticket.date]},
                            {"key": "hour", "value": ["string", ticket.hour]},
                            {"key": "rowNo", "value": ["string", ticket.rowNo]},
                            {"key": "seatNo", "value": ["string", ticket.seatNo]}
                        ],
                        mutable_data: [],
                        tokens_to_back: []
                }
            })
        }

        return {
            transactionId: null,
            transactionType: 'createTicket',
            transactionsBody: transactions
        };
    }

}
