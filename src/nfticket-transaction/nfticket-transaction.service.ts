import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import * as TICKET_SCHEMA from '../schemas/ticketSchema.json'; // this ts file should still be imported fine
import { Logger } from "tslog";
import NfticketSignatureProvider from '../utilities/NfticketSignatureProvider';
import { Signature, PublicKey } from "eosjs/dist/eosjs-jssig";

const { Api, JsonRpc, RpcError } = require('eosjs');
const fetch = require('node-fetch');
var _ = require('lodash');

/**
 * Backend class service to send and validate transactions
 * 
 */
import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { GetTransactionResult, ProcessedTransaction } from 'eosjs/dist/eosjs-rpc-interfaces';
import { RpcTransactionReceipt, BlockchainTransactionStatus } from '../utilities/RpcTransactionReceipt';

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

    collNamePrefix = "nfticket2895"

    blockchainUrl: string
    appName: string
    chainId: string

    atomicAssetContractAccountName: string
    tempAccountOwnerAssets: string
    tempAccountOwnerPrivKey: string
    transferContractName: string
    systemTokenBlockchain: string
    systemTokenFixedPrecision: number

    constructor(private configService: ConfigService, private atomicAssetsService: AtomicAssetsQueryService, 
            private appwriteService: AppwriteService){
        this.blockchainUrl = configService.get<string>('blockchainNodeUrl')
        this.appName = configService.get<string>('appName')
        this.chainId = configService.get<string>('chainId')
        this.atomicAssetContractAccountName = configService.get<string>('atomicAssetContractAccountName')
        this.tempAccountOwnerAssets = configService.get<string>('tempAccountOwnerAssets')
        this.tempAccountOwnerPrivKey = configService.get<string>('tempAccountOwnerPrivKey')
        this.systemTokenBlockchain = configService.get<string>('blockchainTokenSymbol')
        this.systemTokenFixedPrecision = configService.get<number>('blockchainTokenFixedPrecision')
        this.transferContractName = configService.get<string>('blockchainTransferContractName')
    }

    initiate(): any{
        return {
            blockchainUrl: this.blockchainUrl,
            appName: this.appName,
            chainId: this.chainId,
            systemTokenBlockchain: this.systemTokenBlockchain,
            systemTokenFixedPrecision: this.systemTokenFixedPrecision
        };
    }

    async getHistory(transactionId): Promise<GetTransactionResult>{
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        return await rpc.history_get_transaction(transactionId)
    }

    async createTransactionPending(userName: string, transactionType: string, data: string): Promise<string> {
        // Since Anchor already limits us to 2 minutes to sign the transaction, a short time seems good.
        let expireSeconds = 180 //TODO: Export this to config
        let expireDate = new Date()
        expireDate.setSeconds(expireDate.getSeconds() + expireSeconds)
        let transaction = await this.appwriteService.createTransactionPending({
            eosUserName: userName,
            transactionType: transactionType, 
            data: data,
            expirationDate: expireDate.getTime()
        })
        return transaction.$id
    }

    async getTransactionPendingInfo(transactionPendingId){
        let transactionPendingInfo = await this.appwriteService.getTransactionPendingInfo(transactionPendingId);
        if(transactionPendingInfo['data'] != null){
            transactionPendingInfo['data'] = JSON.parse(transactionPendingInfo['data'])
        }
        return transactionPendingInfo
    }

    async deleteTransactionPendingInfo(transactionPendingId){
        let transactionPendingInfo = await this.appwriteService.deleteTransactionPendingInfo(transactionPendingId);
        return transactionPendingInfo
    }

    /**
     * Validate the transactions using the data from the receipt: https://developers.eos.io/welcome/v2.1/protocol-guides/transactions_protocol
     * @param transactionId 
     * @returns a boolean telling if the transaction was successful or not
     */
    async validateBuyOfTicketSucceded(transactionId, userName, expectedTicketPrice): Promise<boolean> {
        this.log.info("Starting validation of buy Transaction of ticket.");
        
        let transactionHistory = (await this.getHistory(transactionId));
        if(transactionHistory.trx?.receipt){
            let transactionReceipt = transactionHistory.trx.receipt as RpcTransactionReceipt;

            if(transactionReceipt.status != BlockchainTransactionStatus.EXECUTED){
                this.log.debug("Transaction has incorrect status. Status: " + transactionReceipt.status);
                return false;
            }

            let processedTransaction = transactionHistory.trx.trx as ProcessedTransaction
            let processedAction = processedTransaction.actions

            // For a transaction to be valid, it needs the following:
            // - Status is "executed"
            // - The action needs to be "transfer"
            // - The action needs to have data "from" of the username
            // - The action needs to have data "to" the nfticket account
            // - The quantity needs to be good and the token type need to be the expected one.
            // - The memo needs the event Id and category Id to be okay with the expected value
            if(processedAction.length != 1){
                this.log.debug("Transaction has more than one action, not valid.");
                return false;
            }

            let action = processedAction[0]
            if(action.name != "transfer"){
                this.log.debug("Transaction action is not transfer, not valid.");
                return false;
            }

            let data = action.data;
            if(data.from != userName){
                this.log.debug("Transaction action data from is not the user, not valid.");
                return false;
            }
            if(data.to != this.tempAccountOwnerAssets){
                this.log.debug("Transaction action data to is not the nfticket account, not valid.");
                return false;
            }

            let quantity = data.quantity;
            if(quantity.split(" ")[1] != this.systemTokenBlockchain){
                this.log.debug("Transaction action quantity is not the system token, not valid.");
                return false;
            }

            if(quantity.split(" ")[0] != expectedTicketPrice.split(" ")[0]){
                this.log.debug("Transaction action quantity is not the expected price, not valid.");
                return false;
            }

            //TODO: Validate memo content. Decide if it's something we want to do.
           /* let memo = data.memo;
            let memoParts = memo.split(" ");
            let eventId = memoParts.find(part => part == eventId);
            if(eventId == undefined){
                this.log.debug("Transaction action memo does not contain the event Id, not valid.");
                return false;
            }*/

            return true;
        }

        return false;
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

        return transactions
    }

    async getRemainingTickets(ticketCategoryId: string) {
        let ticketsNotSold = await this.appwriteService.getTicketsNotSold(ticketCategoryId)
        return ticketsNotSold;        
    }

    async getCollNameForEvent(ticketCategoryId: string) {
        let ticketsNotSold = await this.appwriteService.getCollNameForEvent(ticketCategoryId)
        return ticketsNotSold;        
    }

    chooseTicketAndReserve(tickets){
        //TODO: reserve the tickets in the DB to prevent it being stolen while transactionning.
        return tickets[0]
    }

    async checkIfTicketRemaining(ticketCategoryId: string){
        // Check if remaining tickets
        let remainingTickets = await this.getRemainingTickets(ticketCategoryId);
        return remainingTickets.length > 0
    }

    async createBuyTransaction(userName: string, ticketCategoryId: string){
        let ticketCategory = await this.appwriteService.getTicketCategory(ticketCategoryId)
        let ticketPrice = parseFloat(ticketCategory['price']);
        let eventId = ticketCategory['eventId']

        let transactions = [];
        if(ticketPrice > 0){
            transactions.push({
                account: this.transferContractName,
                name: 'transfer',
                data: {
                    from: userName,
                    to: this.tempAccountOwnerAssets,
                    quantity: ticketPrice.toFixed(this.systemTokenFixedPrecision) + ' ' + this.systemTokenBlockchain,
                    memo: 'Buying a ticket for an event with ID: ' + eventId + ' and ticket category ID: ' + ticketCategoryId + 'on NFTicket platform.'
                  }
            })
        }

        return transactions

    }

    async createSignTransaction(userName: string, assetId: string, transactionComplete: any){
        let transactions = [];
        // Create dummy offer for the user to sign but not broadcast.
        let dummyAtomicId = '1099511627820' //TODO: Export this to config file
        transactions.push({
            account: this.atomicAssetContractAccountName,
            name: 'createoffer',
            data: {
                sender: userName,
                recipient: this.tempAccountOwnerAssets,
                sender_asset_ids: [],
                recipient_asset_ids: [ dummyAtomicId ],
                memo: "Validation transaction to check the authencity of the user. Not for broadcasting."
            }
        })

        return transactions
    }

    async mintTicketForEvent(ticket, collName){
        let ticketCategory = await this.appwriteService.getTicketCategory(ticket.categoryId)

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
                    mutable_data: [
                        { key: "signed", value: [ "uint8", "0" ]},
                    ],
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
            this.log.error("Error happenned during minting of the assets: " + err)
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
            this.log.error("Error happenned during transfer of the assets to the user: " + err)
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

        let collNameEvent = await this.getCollNameForEvent(ticketCategoryId)   
        if(collNameEvent == null || collNameEvent == ''){
            return {
                "success": false,
                "data" : "Collection Name is invalid. Event is probably invalid"
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
            ticketChoosen.assetId = await this.mintTicketForEvent(ticketChoosen, collNameEvent)

            await this.updateTicket(ticketChoosen.$id, {
                assetId: ticketChoosen.assetId
            });
        }

        // Create the transfer to the buyer
        await this.transfertAssetToUser(ticketChoosen.assetId, userName);
        
        return ticketChoosen
    }

    /**
     * Makes the validation to ensure that it is really the specified user that signed the transaction.
     * 
     * Lots of code inspired from: https://github.com/udbhav-s/wax-auth/blob/main/wax-auth/src/index.ts
     */
    async validateTicketSign(signedTransactions, userName: string, serializedTransaction: Uint8Array): Promise<any> {
        if (!signedTransactions || !signedTransactions.signatures.length || !serializedTransaction) {
            return false;
        }
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        // make buffer from transaction
        const arr = [];
        for (const key in serializedTransaction) {
            arr.push(serializedTransaction[key]);
        }
        const uarr = new Uint8Array(arr);

        const buf = Buffer.from(uarr);

        const data = Buffer.concat([
            Buffer.from(this.chainId, 'hex'),
            buf,
            Buffer.from(new Uint8Array(32)),
        ]);

        const recoveredKeys: string[] = [];
        signedTransactions.signatures.forEach((sigstr: string) => {
            const sig = Signature.fromString(sigstr);
            recoveredKeys.push(
                PublicKey.fromString(sig.recover(data).toString()).toLegacyString(),
            );
        });

        //Public key: recoveredKeys[0]

        // From here, we have the public key which signed the transaction.
        recoveredKeys[0]
        const claimedUser = await rpc.get_account(userName);
        if (claimedUser?.permissions) {
            const claimedUserKeys: string[] = [];
            claimedUser.permissions.forEach((perm) => {
                perm.required_auth.keys.forEach((obj) => claimedUserKeys.push(obj.key));
            });

            let match = false;
            recoveredKeys.forEach((rk) => {
                claimedUserKeys.forEach((ck) => {
                if (rk == ck) match = true;
                });
            });
            if (!match) {
                return false;
            }
        }
        const actions = await api.deserializeActions(
            api.deserializeTransaction(uarr).actions,
        );
        const action = actions.find((a) => a.name === 'createoffer');
        if (!action) return false;

        if(action.data.sender != userName || action.data?.recipient != this.tempAccountOwnerAssets
        || action.data.recipient_asset_ids[0] != '1099511627820'){ //TODO: Generalize asset id
            return false;
        }

        return true;
    }

}
