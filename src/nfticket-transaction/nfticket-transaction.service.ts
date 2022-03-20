import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import * as TICKET_SCHEMA from '../schemas/ticketSchema.json'; // this ts file should still be imported fine
import { Logger } from "tslog";

const { Api, JsonRpc, RpcError } = require('eosjs');
import { SignatureProvider, SignatureProviderArgs } from 'eosjs/dist/eosjs-api-interfaces';
import { PushTransactionArgs } from 'eosjs/dist/eosjs-rpc-interfaces';
import { PrivateKey } from 'eosjs/dist/eosjs-key-conversions';
import { ec } from 'elliptic';
const fetch = require('node-fetch');
var _ = require('lodash');

/**
 * Backend class service to send and validate transactions
 * 
 */

import { Injectable } from '@nestjs/common';
import { AppwriteService } from 'src/appwrite/appwrite.service';

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

/**
 * SignatureProvider modified for application implementation.
 * 
 * The reason why we don't just use JsSignatureProvider is to prevent
 * losing the private key if there is ever a change or a hack of the lib.
 * 
 * However, the code is very similar.
 * Source: https://github.com/EOSIO/eosjs/blob/master/src/eosjs-jssig.ts
 */
class NfticketSignatureProvider implements SignatureProvider {
    public keys = []

    /** expensive to construct; so we do it once and reuse it */
    defaultEc = new ec('secp256k1');

    /** Construct the digest from transaction details */
    digestFromSerializedData = (
        chainId: string,
        serializedTransaction: Uint8Array,
        serializedContextFreeData?: Uint8Array,
        e = this.defaultEc): string => {
        const signBuf = Buffer.concat([
            Buffer.from(chainId, 'hex'),
            Buffer.from(serializedTransaction),
            Buffer.from(
                serializedContextFreeData ?
                    new Uint8Array(e.hash().update(serializedContextFreeData).digest()) :
                    new Uint8Array(32)
            ),
        ]);
        return e.hash().update(signBuf).digest();
    };

    /** Sign a transaction */
    async sign(
        { chainId, requiredKeys, serializedTransaction, serializedContextFreeData }: SignatureProviderArgs
    ): Promise<PushTransactionArgs> {
        const digest = this.digestFromSerializedData( chainId, serializedTransaction, serializedContextFreeData);
        const signatures = [] as string[];
        for (const key of requiredKeys) {
            let privateKey = PrivateKey.fromString(key)
            this.keys.push(privateKey.getPublicKey())
            const signature = privateKey.sign(digest, false);
            signatures.push(signature.toString());
        }

        return { signatures, serializedTransaction, serializedContextFreeData };
    }

    getAvailableKeys(): Promise<string[]> {
        let keys = []
        for(let key in this.keys){
            keys.push(key.toString())
        }
        return new Promise((resolve, reject) => {
            resolve(keys);
          });
    };

}

@Injectable()
export class NfticketTransactionService {
    log: Logger = new Logger({ name: "NfticketTransactionServiceLogger"})

    collNamePrefix = "nfticket2895"

    blockchainUrl: string
    appName: string
    chainId: string

    atomicAssetContractAccountName: string
    tempAccountOwnerAssets: string
    tempAccountOwnerPrivKey: string

    constructor(private configService: ConfigService, private atomicAssetsService: AtomicAssetsQueryService, 
            private appwriteService: AppwriteService){
        this.blockchainUrl = configService.get<string>('blockchainNodeUrl')
        this.appName = configService.get<string>('appName')
        this.chainId = configService.get<string>('chainId')
        this.atomicAssetContractAccountName = configService.get<string>('atomicAssetContractAccountName')
        this.tempAccountOwnerAssets = configService.get<string>('tempAccountOwnerAssets')
        this.tempAccountOwnerPrivKey = configService.get<string>('tempAccountOwnerPrivKey')
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

    /**
     * Execute transactions as the user that is owned by the backend.
     * Is private for protection, not allowing anyone to submit transactions.
     */
    private async executeTransactionAsNfticket(actions: any) {
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        // Complement Actions
        actions.forEach((element) => {
            element.authorization = [{actor: this.tempAccountOwnerAssets, permission: 'active'}]
        })

        try{
            // Make the unsigned Transaction
            let unsignedTransactions = await api.transact({ actions: actions }, { 
                broadcast:false,
                sign:false,
                blocksBehind: 3,
                expireSeconds: 30,
            })
    
            // Sign the transaction
            // This part could be done elsewhere (Secure enclave) for security.
            let signatureProvider = new NfticketSignatureProvider()
            let signedTransactions = await signatureProvider.sign({ 
                chainId: this.chainId, 
                requiredKeys: [ this.tempAccountOwnerPrivKey ], 
                serializedTransaction: unsignedTransactions.serializedTransaction, 
                serializedContextFreeData: unsignedTransactions.serializedContextFreeData, 
                abis:null 
            })
            
            // Push the signed transaction on the blockchain
            let data = await rpc.push_transaction(signedTransactions)
            return data.transaction_id
        } catch(e){
            this.log.error("Error happened during transaction on blockchain: " + e)
            throw e
        }
    }

    /**
     * Allows to generate a unique name for each users, using a defined prefix and taking
     * into account variable EOS user name.
     * 
     * Variation parameter can be used in the event that a coll name already exists.
     */
    getCollNameForUser(userName, variation = 0){
        let targetLength = 12
        let userNameLength = userName.length
        let remainingLength = targetLength - userNameLength

        return this.collNamePrefix.slice(0 + variation, remainingLength + variation) + userName
    }

    convertAtomicAssetsArrayToJsonArray(originalArray: any[]){
        let newArray = []
        for(let trx of originalArray){
            let newObject = {}
            for(let obj of trx){
                newObject[obj.key] = obj.value[1]
            }
            newArray.push(newObject);
        }

        return newArray;
    }

    async createTicketCategoryTemplate(userName, collName, tickets: Ticket[]) {
        if(collName.length != 12){
            throw new Error("Collection Name must be exactly 12 characters.")
        }

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
                    authorized_accounts: [
                        userName, this.tempAccountOwnerAssets
                    ],
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
                            {"key": "originalPrice", "value": ["string", ticket.originalPrice]},
                            {"key": "categoryName", "value": ["string", ticket.categoryName]}
                        ]
                }
            })
        }

        // Put to true to allow NFTICKET account to make transaction on your coll, if already created.
        if(false){
            transactions.push({
                account: 'atomicassets',
                name: 'addcolauth',
                data: { 
                    collection_name: collName,
                    account_to_add: this.tempAccountOwnerAssets
                }
            });
        }

        return {
            transactionId: null,
            transactionType: 'createTicket',
            transactionsBody: transactions,
            userName: userName
        };
    }

    async getRemainingTickets(ticketCategoryId: string) {
        let ticketsNotSold = await this.appwriteService.getTicketsNotSold(ticketCategoryId)
        return ticketsNotSold;        
    }

    chooseTicketAndReserve(tickets){
        //TODO: reserve the tickets in the DB to prevent it being stolen while transactionning.
        return tickets[0]
    }

    async mintTicketForEvent(ticket){
        let ticketCategory = await this.appwriteService.getTicketCategory(ticket.categoryId)

        //TODO: set collName
        let collName = "nfticanthony";

        let transactionObject = {
            account: this.atomicAssetContractAccountName,
            name: 'mintasset',
            data: {
                    authorized_minter: this.tempAccountOwnerAssets,
                    collection_name: collName,
                    schema_name: Ticket.getSchemaName(),
                    template_id: ticketCategory['atomicTemplateId'],
                    new_asset_owner: this.tempAccountOwnerAssets,
                    immutable_data: [],
                    mutable_data: [],
                    tokens_to_back: []
            }
        }

        try{
            await this.executeTransactionAsNfticket([transactionObject]);

            // Get asset ID of the ticket we just created.
            let allAssets = await this.atomicAssetsService.getAssets(this.tempAccountOwnerAssets, 1, true)

            // TODO: Add validation to see if the queried asset is effectively the good one.
            if(allAssets.rows.length != 1){
                throw new Error("No assets found");
            }

            return allAssets.rows[0].asset_id;   
        } catch(err){
            console.log("Error happenned during minting of the assets: " + err)
            throw err;
        }
    }

    async transfertAssetToUser(assetId, userName){
        let transactionObject = {
            account: this.atomicAssetContractAccountName,
            name: 'transfer',
            data: {
                    from: this.tempAccountOwnerAssets,
                    to: userName,
                    asset_ids: [ assetId ],
                    memo: 'Buy of this ticket executed via NFTicket platform'
            }
        }

        try{
            await this.executeTransactionAsNfticket([transactionObject]);

        } catch(err){
            console.log("Error happenned during transfer of the assets to the user: " + err)
            throw err;
        }
    }

    async updateTicket(ticketId, modifiedData){
        this.appwriteService.updateTicket(ticketId, modifiedData)
    }

    async validateCreateTicketTemplate(collName: string, transactionsBody: any[]): Promise<any[]>{
        let createTemplTransactionsDone = transactionsBody.filter((element) => element.name == 'createtempl')
                                        .map((element) => element.data.immutable_data);
        let createTemplTransactionsDoneObj = this.convertAtomicAssetsArrayToJsonArray(createTemplTransactionsDone)

        // Take 3 more templates as a precaution. Even if you own the collection.
        let allTemplates = await this.atomicAssetsService.getTemplates(collName, null, createTemplTransactionsDone.length + 3, true)
        let templatesWithId = []

        for(let rowData of allTemplates.rows){
            let template = createTemplTransactionsDoneObj.find((element) => {
                // We need to check if == 0, cause it is the case of a category ticket being free
                if(element.originalPrice || element.originalPrice === 0)
                    element.originalPrice = element.originalPrice.toString()
                return _.isEqual(element, rowData.immutable_serialized_data)
            })
            if(typeof(template) !== "undefined"){
                template['template_id'] = rowData.template_id
                templatesWithId.push(template)
            }
        }

        return templatesWithId;
    }

    async validateTicketBuy(ticketCategoryId, userName){
        // Check if remaining tickets
        let remainingTickets = await this.getRemainingTickets(ticketCategoryId);
        if(remainingTickets.length == 0){
            return {
                "success": false,
                "data" : "No tickets remaining for this category"
            }
        }

        // Choose one of the tickets
        let ticketChoosen = await this.chooseTicketAndReserve(remainingTickets)

        // Set as sold, since we already confirmed the payment here
        await this.updateTicket(ticketChoosen.$id, {
            isSold: true
        });

        // Mint the ticket if necessary
        if(ticketChoosen.assetId == null){
            ticketChoosen.assetId = await this.mintTicketForEvent(ticketChoosen)

            await this.updateTicket(ticketChoosen.$id, {
                assetId: ticketChoosen.assetId
            });
        }

        // Create the transfer to the buyer
        await this.transfertAssetToUser(ticketChoosen.assetId, userName);
        
        return ticketChoosen
    }

}
