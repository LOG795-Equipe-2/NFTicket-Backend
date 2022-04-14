import { ConfigService } from '@nestjs/config';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
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
import { GetTransactionResult, ProcessedTransaction, PushTransactionArgs } from 'eosjs/dist/eosjs-rpc-interfaces';
import { RpcTransactionReceipt, BlockchainTransactionStatus } from '../utilities/RpcTransactionReceipt';
import { Ticket } from '../utilities/TicketObject.dto';
import { EosTransactionRequestObject } from '../utilities/EosTransactionRequestObject.dto';
import { ValidationResponse } from '../utilities/ValidationResponse';
import { Models } from 'node-appwrite';
import { PerformanceAnalyserService } from '../performance-analyser/performance-analyser.service';
import { NfticketSchemaMutableData } from './DTO/NfticketSchemaMutableData';
import { TicketModel, TransactionsPendingModel } from 'src/interface/appwrite.model';

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
            private appwriteService: AppwriteService,
            private performanceAnalyserService: PerformanceAnalyserService){
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

    async getTransactionPendingInfo(transactionPendingId): Promise<any>{
        let transactionPendingInfo = await this.appwriteService.getTransactionPendingInfo(transactionPendingId) as TransactionsPendingModel;
        if(transactionPendingInfo.data != null){
            transactionPendingInfo.data = JSON.parse(transactionPendingInfo.data)
        }
        return transactionPendingInfo
    }

    async deleteAllExpiredTransactionsPending(): Promise<Models.Document[]>{
        let transactionPendingInfo = await this.appwriteService.getTransactionsPendingExpired();
        this.log.info(transactionPendingInfo.length + " marked for deletion");
        transactionPendingInfo.forEach(d => {
            this.appwriteService.deleteTransactionPendingInfo(d.$id)
        })
        return transactionPendingInfo
    }

    async validateTransactionPendingDate(transactionPendingInfo: TransactionsPendingModel): Promise<boolean>{
        let expirationDate = transactionPendingInfo.expirationDate;
        if(!expirationDate){
            return false;
        }
        let dateNow = new Date().getTime()
        if(expirationDate < dateNow){
            return false;
        } else {
            return true;
        }
    }

    async deleteTransactionPendingInfo(transactionPendingId){
        let transactionPendingInfo = await this.appwriteService.deleteTransactionPendingInfo(transactionPendingId);
        return transactionPendingInfo
    }

    /**
     * Validate the transactions using the data from the receipt: 
     * @param transactionId 
     * @returns a boolean telling if the transaction was successful or not
     */
    async validateBuyTicketsSignedTransaction(signatures, userName, serializedTransaction, expectedTicketPrice): Promise<ValidationResponse> {
        this.log.info("Starting validation of buy Transaction of ticket.");
        
        let messages: string[] = []

        if (!signatures || !signatures.length || !serializedTransaction) {
            return;
        }
        let expectedActionName = 'transfer'

        // Get the data of the actions
        const actions = await this.getActionDataIfUserValid(signatures, userName, serializedTransaction);
        if(!actions) {
            return {
                success: false,
                messages: ["Actions could not be retreived. User is not the one that signed the transactions."]
            }
        }
        // Check if it has the expected actions
        const action = actions.find((a) => a.name === expectedActionName);
        if(!actions) {
            return {
                success: false,
                messages: ["Required action 'transfer' is not found in the bundle of transactions."]
            }
        }

        // For a transaction to be valid, it needs the following:
        // - Status is "executed"
        // - The action needs to be "transfer" (above)
        // - The action needs to have data "from" of the username
        // - The action needs to have data "to" the nfticket account
        // - The quantity needs to be good and the token type need to be the expected one.
        // - The memo needs the event Id and category Id to be okay with the expected value
        if(actions.length != 1){
            let message = "Transaction has more than one action, not valid."
            this.log.debug(message);
            messages.push(message);
        }

        let data = action.data;
        if(data.from != userName){
            let message = "Transaction action data from is not the user, not valid."
            this.log.debug(message);
            messages.push(message);
        }
        if(data.to != this.tempAccountOwnerAssets){
            let message = "Transaction action data to is not the nfticket account, not valid."
            this.log.debug(message);
            messages.push(message);
        }

        let quantity = data.quantity;
        if(quantity.split(" ")[1] != this.systemTokenBlockchain){
            let message = "Transaction action data quantity is not the expected token type, not valid."
            this.log.debug(message);
            messages.push(message);
        }

        if(quantity.split(" ")[0] != expectedTicketPrice.split(" ")[0]){
            let message = "Transaction action data quantity is not the expected ticket price, not valid."
            this.log.debug(message);
            messages.push(message);
        }

        //TODO: Validate memo content. Decide if it's something we want to do.
        /* let memo = data.memo;
        let memoParts = memo.split(" ");
        let eventId = memoParts.find(part => part == eventId);
        if(eventId == undefined){
            this.log.debug("Transaction action memo does not contain the event Id, not valid.");
            return false;
        }*/

        return {
            success: messages.length == 0,
            messages: messages
        };
    }

    /**
     * Execute transactions as the user that is owned by the backend.
     * Is private for protection, not allowing anyone to submit transactions.
     */
    private async executeTransactionAsNfticket(actions: any) {
        var startTime = process.hrtime();
        let transactionsName = []

        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        // Complement Actions
        actions.forEach((element) => {
            element.authorization = [{actor: this.tempAccountOwnerAssets, permission: 'active'}]
            transactionsName.push(element.name)
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
            
            // Log the time it took to execute the transaction
            this.performanceAnalyserService.saveTransactionPerformance(process.hrtime(startTime), "executeTransactionAsNfticket", { transactionsName: transactionsName});
            
            return data.transaction_id
        } catch(e){
            this.log.error("Error happened during transaction on blockchain: " + e)
            throw e
        }
    }

    /**
     * Pack a serialized transaction from Anchor and pushes the transaction.
     * The result is returned.
     * 
     * @param signatures 
     * @param serializedTransaction 
     */
    async pushTransaction(signatures, serializedTransaction){
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const uarr = this.convertSerializedTransactionToUint8Array(serializedTransaction)

        const objectToSend = {
            signatures: signatures,
            serializedTransaction: uarr
            } as PushTransactionArgs

        let result = await rpc.push_transaction(objectToSend);
        this.log.info("Transaction pushed on blockchain: " + result.transaction_id);
        return result
    }

    async deserializeTransactionsActions(serializedTransaction): Promise<any>{
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        const arr = [];
        for (const key in serializedTransaction) {
            arr.push(serializedTransaction[key]);
        }
        const uarr = new Uint8Array(arr);

        const actions = await api.deserializeActions(
            api.deserializeTransaction(uarr).actions,
        );

        return actions;
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
        if(remainingLength < 0) remainingLength = 0
        
        let newColName = this.collNamePrefix.slice(0 + variation, remainingLength + variation) + userName
        if(newColName.length > targetLength){
            newColName = newColName.slice(0, targetLength)
        }
        return newColName
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

    async createTicketCategoryTemplate(userName, collName, tickets: Ticket[]): Promise<EosTransactionRequestObject[]> {
        if(collName.length != 12){
            throw new Error("Collection Name must be exactly 12 characters.")
        }

        let transactions: EosTransactionRequestObject[] = [];
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
                            {"key": "originalPrice", "value": ["string", ticket.originalPrice.toString()]},
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

    async getRemainingTickets(ticketCategoryId: string): Promise<TicketModel[]> {
        let ticketsNotSold = await this.appwriteService.getTicketsAvailable(ticketCategoryId)
        return ticketsNotSold;        
    }

    async getCollNameForEvent(ticketCategoryId: string) {
        let ticketsNotSold = await this.appwriteService.getCollNameForEvent(ticketCategoryId)
        return ticketsNotSold;        
    }

    async chooseTicketAndReserve(tickets, seconds: number){
        // Reserve the tickets in the DB to prevent it being stolen while transactionning.
        let reservedUntil = new Date();
        reservedUntil.setSeconds(reservedUntil.getSeconds() + seconds);
        await this.updateTicket(tickets[0].$id, {
            reservedUntil: reservedUntil.getTime()
        });
        return tickets[0]
    }

    async checkIfTicketRemaining(ticketCategoryId: string){
        // Check if remaining tickets
        let remainingTickets = await this.getRemainingTickets(ticketCategoryId);
        return remainingTickets.length > 0
    }

    async createBuyTransaction(userName: string, ticketCategoryId: string): Promise<EosTransactionRequestObject[]>{
        let ticketCategory = await this.appwriteService.getTicketCategory(ticketCategoryId)
        let ticketPrice = ticketCategory.price;
        let eventId = ticketCategory.eventId;

        let transactions: EosTransactionRequestObject[] = [];
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

    /**
     * Creates a challenge transaction to the user, that is causing no change in the blockchain.
     * @param userName 
     * @param assetId 
     * @returns 
     */
    async createSignTransaction(userName: string, assetId: string){
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
                        { key: "used", value: [ "uint8", "0" ]},
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

    /**
     * Used to increment or decrement the number of tickets sold.
     * @param ticketCategoryId 
     * @param ticketCount 
     */
    async addToTicketCount(ticketCategoryId, ticketCount){
        let ticketCategory = await this.appwriteService.getTicketCategory(ticketCategoryId)
        let ticketCategoryCount = ticketCategory.remainingQuantity
        let newQuantity = ticketCategoryCount + ticketCount
        await this.appwriteService.updateTicketCategory(ticketCategoryId, {remainingQuantity: newQuantity})
    }

    /**
     * Allows to extract the data from the blockchain of the templates that are in a recent transactionBody actions.
     * This is particularly useful to get the id's of the data that were created, in order to store them in the DB.
     * This behavior could be changed in the future, if atomicAssets returns us the template_id on creation.
     * 
     * In this, we also manage the special case in which the property originalPrice (which is an app specific parameters)
     * in which is equal to zero. This is managed differently, because or else the comparison might fail.
     * 
     * @param collName 
     * @param transactionsBody 
     * @returns The corresponding data of the template, including the id.
     */
    async extractTemplateObjectFromTrx(collName: string, transactionsBody: any[]): Promise<any[]>{
        let createTemplTransactionsImmutableData = transactionsBody.filter((element) => element.name == 'createtempl')
                                        .map((element) => element.data.immutable_data);
        let createTemplTransactionsImmutableDataObject = this.convertAtomicAssetsArrayToJsonArray(createTemplTransactionsImmutableData)

        // Take 3 more templates than the number we know we need as a precaution, even if we own the collection.
        let templates = await this.atomicAssetsService.getTemplates(collName, null, createTemplTransactionsImmutableData.length + 3, true)
        let filteredTemplates = []
        for(let rowData of templates.rows){
            let template = createTemplTransactionsImmutableDataObject.find((element) => {
                // We need to check if == 0, cause it is the case of a category ticket being free
                if(element.originalPrice || element.originalPrice === 0)
                    element.originalPrice = element.originalPrice.toString()
                return _.isEqual(element, rowData.immutable_serialized_data)
            })
            if(typeof(template) !== "undefined"){
                template['template_id'] = rowData.template_id
                filteredTemplates.push(template)
            }
        }
        return filteredTemplates;
    }

    async validateTransactionActionsEquals(actionsExpected, actionsActual){
        return _.isMatch(actionsActual, actionsExpected)
    }

    async validateTicketBuy(choosenTicketId, userName){
        // Get the ticket and check if it's still available
        let ticketChoosen = await this.appwriteService.getTicket(choosenTicketId)
        if(ticketChoosen['isSold'] && ticketChoosen['isSold'] == true){
            return {
                "success": false,
                "data" : "Ticket was sold before you could buy it."
            }
        }

        // Get the collname for the event for minting if necessary
        let ticketCategory = await this.appwriteService.getTicketCategory(ticketChoosen['categoryId'])
        let collNameEvent = await this.getCollNameForEvent(ticketCategory.$id)   
        if(collNameEvent == null || collNameEvent == ''){
            return {
                "success": false,
                "data" : "Collection Name is invalid. Event is probably invalid"
            }
        }

        // Set as sold, since we already confirmed the payment here
        await this.updateTicket(ticketChoosen.$id, {
            isSold: true
        });
        // Remove one ticket from the available number
        this.addToTicketCount(ticketChoosen['categoryId'], -1)

        // Mint the ticket if necessary
        if(ticketChoosen['assetId'] == null){
            ticketChoosen['assetId'] = await this.mintTicketForEvent(ticketChoosen, collNameEvent)

            await this.updateTicket(ticketChoosen.$id, {
                assetId: ticketChoosen['assetId']
            });
        }

        // Create the transfer to the buyer
        await this.transfertAssetToUser(ticketChoosen['assetId'], userName);
        
        return ticketChoosen
    }

    /**
     * Makes the validation to ensure that it is really the specified user that signed the transaction.
     * 
     * Lots of code inspired from: https://github.com/udbhav-s/wax-auth/blob/main/wax-auth/src/index.ts
     * 
     * Other example: https://github.com/greymass/anchor-link-demo-multipass/blob/92615393686e35fefb0c977b57b2124d05e8af8e/src/App.js#L53-L67
     */
    async validateTicketSign(signatures: string[], userName: string, serializedTransaction): Promise<ValidationResponse> {
        if (!signatures || !signatures.length || !serializedTransaction) {
            return;
        }
        let expectedActionName = 'createoffer'
        let expectedAssetIdPassed = '1099511627820'

        // Get the data of the actions
        const actions = await this.getActionDataIfUserValid(signatures, userName, serializedTransaction);
        if(!actions) {
            return {
                success: false,
                messages: ["Actions could not be retreived. User is not the one that signed the transactions."]
            }
        }
        // Check if it has the expected actions
        const action = actions.find((a) => a.name === expectedActionName);
        if(!actions) {
            return {
                success: false,
                messages: ["Required action is not found in the bundle of transactions."]
            }
        }
        let messages: string[] = []
        // Validate individually the data
        if(action.data.sender != userName){
            messages.push("Sender is not the user that signed the transaction")
        }
        if(action.data?.recipient != this.tempAccountOwnerAssets){
            messages.push("Recepieint is not the user the user that was expected (main account for nfticket)");
        }
        if(action.data.recipient_asset_ids[0] != expectedAssetIdPassed){
            messages.push("Content of transaction is not what was expected");
        }

        return {
            success: messages.length == 0,
            messages : messages
        }    
    }


    /**
     * Converts a transactions that is serialized like { '0' : 'value' } to a correct Uint8Array and returns the object.
     * @param serializedTransaction 
     * @returns 
     */
    private convertSerializedTransactionToUint8Array(serializedTransaction: Uint8Array) {
        // make buffer from transaction
        const arr = [];
        for (const key in serializedTransaction) {
            arr.push(serializedTransaction[key]);
        }
        const uarr = new Uint8Array(arr);
        return uarr;
    }

    /**
     * From a correct uint8array transaction, recovers the public keys.
     * @param signatures 
     * @param uInt8ArraySerializedTransaction 
     */
    private recoverKeysFromSignature(signatures: string[], uInt8ArraySerializedTransaction: Uint8Array): string[]{
        const buf = Buffer.from(uInt8ArraySerializedTransaction);

        const data = Buffer.concat([
            Buffer.from(this.chainId, 'hex'),
            buf,
            Buffer.from(new Uint8Array(32)),
        ]);

        const recoveredKeys: string[] = [];
        signatures.forEach((sigstr: string) => {
            const sig = Signature.fromString(sigstr);
            recoveredKeys.push(
                PublicKey.fromString(sig.recover(data).toString()).toLegacyString(),
            );
        });

        return recoveredKeys;
    }

    /**
     * Check if the current user has a public key in the list of public keys.
     * 
     */
    private async validateUserHasOneOfPublicKeys(userName: string, candidatePublicKeys: string[]): Promise<boolean> {
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        const claimedUser = await rpc.get_account(userName);
        if (claimedUser?.permissions) {
            const claimedUserKeys: string[] = [];
            claimedUser.permissions.forEach((perm) => {
                perm.required_auth.keys.forEach((obj) => claimedUserKeys.push(obj.key));
            });

            let match = false;
            candidatePublicKeys.forEach((rk) => {
                claimedUserKeys.forEach((ck) => {
                if (rk == ck) match = true;
                });
            });
            if (!match) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns the action data of the serialized transaction, only if the userName is the one that signed the transactions.
     * @param signatures 
     * @param userName 
     * @param serializedTransaction 
     * @returns 
     */
    private async getActionDataIfUserValid(signatures: string[], userName: string, serializedTransaction: Uint8Array): Promise<any> {
        if (!signatures || !signatures.length || !serializedTransaction) {
            return;
        }
        const rpc = new JsonRpc(this.blockchainUrl, { fetch });
        const api = new Api({ rpc })

        const uarr = this.convertSerializedTransactionToUint8Array(serializedTransaction);
        const recoveredKeys: string[] = this.recoverKeysFromSignature(signatures, uarr)

        // From here, we have the public key which signed the transaction.
        const isUserValid = await this.validateUserHasOneOfPublicKeys(userName, recoveredKeys);
        if (!isUserValid) {
            return;
        }
        const actions = await api.deserializeActions(
            api.deserializeTransaction(uarr).actions,
        );
        return actions;
    }


    async validateUserHasTicket(assetId: string, userName:string): Promise<Boolean>{
        let assetsInfo = await this.atomicAssetsService.getAssets(userName, 1, false, assetId)
        if(assetsInfo.rows.length != 1){
            return false;
        }
        if(assetsInfo.rows[0].asset_id != assetId){
            return false;
        }
        return true;
    }

    async signTicketOnBlockchain(assetId: string, userName: string){
        // We need to get the previous mutable data, if we want to change even just one property in the blockchain
        let mutableDataBefore = await this.getAssetsMutableDataFollowingSchema(userName, assetId)

        let transactionObject = {
            account: this.atomicAssetContractAccountName,
            name: 'setassetdata',
            data: {
                    authorized_editor: this.tempAccountOwnerAssets,
                    asset_owner: userName,
                    asset_id: assetId,
                    new_mutable_data: [
                        { key: "signed", value: [ "uint8", "1" ]},
                        { key: "used", value: [ "uint8", mutableDataBefore.used ]},
                    ]
            }
        }
        try{
            await this.executeTransactionAsNfticket([transactionObject]);
        } catch(err){
            this.log.error("Error happenned during signing of ticket for assetID: " + assetId + " for user: " + userName + ":" + err)
            throw err;
        }
    }

    async getAssetsMutableDataFollowingSchema(userName: string, assetId: string): Promise<NfticketSchemaMutableData>{
            // We need to get the previous mutable data, if we want to change even just one property in the blockchain
            let assetBefore = await this.atomicAssetsService.getAssets(userName, 1, false, assetId)
            if(assetBefore.rows.length != 1 || assetBefore.rows[0].asset_id != assetId){
                let message = "Element with assetID: " + assetId + " for user: " + userName + " could not be found on blockchain."
                this.log.error(message)
                throw new Error(message);
            }
            // Fix if the property was not setted
            if(!assetBefore.rows[0].mutable_serialized_data.signed){
                assetBefore.rows[0].mutable_serialized_data.signed = 0
            }
            if(!assetBefore.rows[0].mutable_serialized_data.used){
                assetBefore.rows[0].mutable_serialized_data.used = 0
            }

            return assetBefore.rows[0].mutable_serialized_data;
    }

    async setTicketUsedOnBlockchain(assetId: string, userName: string){
        // We need to get the previous mutable data, if we want to change even just one property in the blockchain
        let mutableDataBefore = await this.getAssetsMutableDataFollowingSchema(userName, assetId)

        let transactionObject = {
            account: this.atomicAssetContractAccountName,
            name: 'setassetdata',
            data: {
                    authorized_editor: this.tempAccountOwnerAssets,
                    asset_owner: userName,
                    asset_id: assetId,
                    new_mutable_data: [
                        { key: "signed", value: [ "uint8", mutableDataBefore.signed ]},
                        { key: "used", value: [ "uint8", "1" ]},
                    ]
            }
        }
        try{
            await this.executeTransactionAsNfticket([transactionObject]);
        } catch(err){
            this.log.error("Error happenned during set of property \"used\" of ticket for assetID: " + assetId + " for user: " + userName + ":" + err)
            throw err;
        }
    }

    async getTicketPrice(ticketId: string): Promise<number> {
        let ticket = await this.appwriteService.getTicket(ticketId)
        let ticketCategory = await this.appwriteService.getTicketCategory(ticket.categoryId)
        
        return ticketCategory.price
    }

    /**
     * Validates that a transaction has status Executed, and returns the associated actions.
     * 
     * Source: https://developers.eos.io/welcome/v2.1/protocol-guides/transactions_protocol
     * @param transactionId
     * @returns 
     */
    private async getActionDataFromHistoryIfStatusExecuted(transactionId){
        let transactionHistory = (await this.getHistory(transactionId));

        if(transactionHistory.trx?.receipt){
            let transactionReceipt = transactionHistory.trx.receipt as RpcTransactionReceipt;
            if(transactionReceipt.status != BlockchainTransactionStatus.EXECUTED){
                this.log.debug("Transaction has incorrect status. Status: " + transactionReceipt.status);
                return;
            }
            let processedTransaction = transactionHistory.trx.trx as ProcessedTransaction
            let processedAction = processedTransaction.actions

            return processedAction
        } else {
            return;
        }
    }
}
