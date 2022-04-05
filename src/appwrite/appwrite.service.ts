import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Query } from 'appwrite';
import { Logger } from "tslog";
import { Account, AppwriteException, Client, Database, Models, Storage, Users } from "node-appwrite"
import TransactionPendingCollItem from '../utilities/TransactionPendingCollItem';

enum AppwriteDatabaseTable{
    TICKET_CATEGORIES = '622111bde1ca95a94544',
    TICKETS = '6221134c389c90325a38',
    EOS_INFO = '621fcb8641b53f76bc95',
    EVENTS = '62210e0672c9be723f8b',
    TICKET_CATEGORY_STYLINGS = '622112b4efbb25929545',
    TRANSACTIONS_PENDING = '62432080ee967095751b'
}

@Injectable()
export class AppwriteService {
    log: Logger = new Logger({ name: "AppwriteService"})

    /**
     * @property This Client has admin access to Appwrite, if you need to do an action on behalf of a user
     * you need to create a new client with the initAccoundClient(); method
     */
    serverClient: Client;
    database: Database;
    storage: Storage;
    users: Users;

    constructor(private configService: ConfigService){
        this.serverClient = new Client();
        this.database = new Database(this.serverClient);
        this.storage = new Storage(this.serverClient);
        this.users = new Users(this.serverClient);

        this.serverClient
            .setEndpoint(this.configService.get("appwriteEndpoint"))
            .setProject(this.configService.get("appwriteProjectId"))
            .setKey(this.configService.get("appwriteSecret"));
    }

    private initAccountClient(jwt: string) {
        const accountClient: Client = new Client();
        accountClient
            .setEndpoint(this.configService.get("appwriteEndpoint"))
            .setProject(this.configService.get("appwriteProjectId"))
            .setJWT(jwt);
        return accountClient;
    }

    /**
     * Deletes all data in appwrite related to events
     * THIS IS ONLY FOR DEBUGGING
     */
    async deleteAllEvents() {
        let files = await this.storage.listFiles();
        files.files.forEach(f => {
            this.storage.deleteFile(f.$id)
        })
        // Collections that are affected - Events - TicketCategories - TicketCategoryStylings - Tickets
        const collectionIdList = ["62210e0672c9be723f8b", "622111bde1ca95a94544", "622112b4efbb25929545", "6221134c389c90325a38"];
        collectionIdList.forEach(async colId => {
            const docs = await this.database.listDocuments(colId);
            docs.documents.forEach(d => {
                this.database.deleteDocument(colId, d.$id);
            })
        })
    }

    /**
     * extracts the user id from a jwt
     * @param jwt 
     * @returns the userId if the jwt is valid, undefined otherwise
     */
    async getUserIdFromJwt(jwt: string): Promise<string> {
        try {
            const account = new Account(this.initAccountClient(jwt))
            const user = await account.get();
            
            return user.$id;
        } catch(e) {
            let error = e as AppwriteException;

            if(error.code === 401)
                this.log.error("invalid jwt");

            this.log.error(error.message)
            return undefined;
        }
    }

    /**
     * Get the tickets available in the db, which are not sold and not reserved.
     * @param ticketCategoryId 
     * @returns 
     */
    async getTicketsAvailable(ticketCategoryId: string){
        let dateTimeNow = (new Date()).getTime()
        try{
            let response = await this.database.listDocuments(AppwriteDatabaseTable.TICKETS, [
                 Query.equal('categoryId', ticketCategoryId),
                 Query.equal('isSold', false),
                 Query.lesser('reservedUntil', dateTimeNow),
             ]);
            return response.documents
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getCollNameForEvent(ticketCategoryId: string){
        try{
            let ticketCategory = await this.getTicketCategory(ticketCategoryId);
            let eventId = ticketCategory['eventId'];
            if(eventId == null){
                return null;
            }
            let response = await this.database.getDocument(AppwriteDatabaseTable.EVENTS, eventId);
            return response['atomicCollName']
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTicketCategory(ticketCategoryId: string){
        try{
            let response = await this.database.getDocument(AppwriteDatabaseTable.TICKET_CATEGORIES, ticketCategoryId);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async updateTicketCategory(ticketCategoryId, modifiedData){
        try{
            let response = await this.database.updateDocument(AppwriteDatabaseTable.TICKET_CATEGORIES, ticketCategoryId, modifiedData);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTicket(ticketId: string){
        try{
            let response = await this.database.getDocument(AppwriteDatabaseTable.TICKETS, ticketId);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async updateTicket(ticketId, modifiedData){
        try{
            let response = await this.database.updateDocument(AppwriteDatabaseTable.TICKETS, ticketId, modifiedData);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async createTransactionPending(transactionPending: TransactionPendingCollItem){
        try{
            let response = await this.database.createDocument(AppwriteDatabaseTable.TRANSACTIONS_PENDING, 'unique()', transactionPending);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTransactionPendingInfo(transactionPendingId: string){
        try{
            let response = await this.database.getDocument(AppwriteDatabaseTable.TRANSACTIONS_PENDING, transactionPendingId);
            return response;
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async deleteTransactionPendingInfo(transactionPendingId: string){
        try{
            let response = await this.database.deleteDocument(AppwriteDatabaseTable.TRANSACTIONS_PENDING, transactionPendingId);
            return response;
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }
}
