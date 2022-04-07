import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Account, AppwriteException, Client, Database, Models, Storage, Users } from "node-appwrite"
import { EventSearchQuery } from 'src/appwrite/DTO/search-event.dto';
import { EventModel, Query } from '../interface/appwrite.model';
import { Logger } from "tslog";
import TransactionPendingCollItem from '../utilities/TransactionPendingCollItem';

@Injectable()
export class AppwriteService {
    log: Logger = new Logger({ name: "AppwriteService"})

    private readonly TICKET_CATEGORIES_COLLECTION_ID: string;
    private readonly EOS_INFO_COLLECTION_ID: string;
    private readonly EVENTS_COLLECTION_ID: string;
    private readonly TICKETS_COLLECTION_ID: string;
    private readonly TICKET_CATEGORIES_STYLINGS_COLLECTION_ID: string;
    private readonly TRANSACTIONS_PENDING_COLLECTION_ID: string;
    private readonly PERFORMANCE_LOGGING_COLLECTION_ID: string;

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

        this.TICKET_CATEGORIES_COLLECTION_ID = this.configService.get("appwriteCollectionIdTicketCategories");
        this.EOS_INFO_COLLECTION_ID = this.configService.get("appwriteCollectionIdEosInfo");
        this.EVENTS_COLLECTION_ID = this.configService.get("appwriteCollectionIdEvents");
        this.TICKETS_COLLECTION_ID = this.configService.get("appwriteCollectionIdTickets");
        this.TICKET_CATEGORIES_STYLINGS_COLLECTION_ID = this.configService.get("appwriteCollectionIdTicketCategoriesStylings");
        this.TRANSACTIONS_PENDING_COLLECTION_ID = this.configService.get("appwriteCollectionIdTransactionsPending");
        this.PERFORMANCE_LOGGING_COLLECTION_ID = this.configService.get("appwriteCollectionIdPerformanceLogging");
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

    async searchEvent(query: EventSearchQuery) {

        const queryParams = [
            Query.search("name", query.name),
            Query.search("locationCity", query.locationCity),
        ];

        if(query.locationName !== "")
          queryParams.push(Query.search("locationName", query.locationName))

          const events = await this.database.listDocuments<EventModel>(this.EVENTS_COLLECTION_ID, queryParams);
          return events.documents;
        
    }

    async getFeaturedEvent(city: string) {
      let today = new Date();
      let nextweek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

      const queryParams = [
        Query.equal("locationCity", city),
        Query.greater("eventTime", today.getTime()),
        Query.lesser("eventTime", nextweek.getTime())
      ];

      const events = await this.database.listDocuments<EventModel>(this.EVENTS_COLLECTION_ID, queryParams, 5, 0, "", "", ["eventTime"], ["ASC"]);

      return events.documents;

    }

    /**
     * Get the tickets available in the db, which are not sold and not reserved.
     * @param ticketCategoryId 
     * @returns 
     */
     async getTicketsAvailable(ticketCategoryId: string){
        let dateTimeNow = (new Date()).getTime()
        try{
            let response = await this.database.listDocuments(this.TICKETS_COLLECTION_ID, [
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
            let response = await this.database.getDocument(this.EVENTS_COLLECTION_ID, eventId);
            return response['atomicCollName']
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTicketCategory(ticketCategoryId: string){
        try{
            let response = await this.database.getDocument(this.TICKET_CATEGORIES_COLLECTION_ID, ticketCategoryId);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async updateTicketCategory(ticketCategoryId, modifiedData){
        try{
            let response = await this.database.updateDocument(this.TICKET_CATEGORIES_COLLECTION_ID, ticketCategoryId, modifiedData);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTicket(ticketId: string){
        try{
            let response = await this.database.getDocument(this.TICKETS_COLLECTION_ID, ticketId);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async updateTicket(ticketId, modifiedData){
        try{
            let response = await this.database.updateDocument(this.TICKETS_COLLECTION_ID, ticketId, modifiedData);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async createTransactionPending(transactionPending: TransactionPendingCollItem){
        try{
            let response = await this.database.createDocument(this.TRANSACTIONS_PENDING_COLLECTION_ID, 'unique()', transactionPending);
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTransactionPendingInfo(transactionPendingId: string){
        try{
            let response = await this.database.getDocument(this.TRANSACTIONS_PENDING_COLLECTION_ID, transactionPendingId);
            return response;
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getTransactionsPendingExpired(){
        let dateTimeNow = (new Date()).getTime()
        try{
            let response = await this.database.listDocuments(this.TRANSACTIONS_PENDING_COLLECTION_ID, [
                 Query.lesser('expirationDate', dateTimeNow),
             ], 100);
            return response.documents
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async deleteTransactionPendingInfo(transactionPendingId: string){
        try{
            let response = await this.database.deleteDocument(this.TRANSACTIONS_PENDING_COLLECTION_ID, transactionPendingId);
            return response;
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async createPerformanceLogging(executionTimeMs:number, operationName:string, extraData: string){
        try{
            let response = await this.database.createDocument(this.PERFORMANCE_LOGGING_COLLECTION_ID, 'unique()', {
                executionTimeMs: executionTimeMs,
                operationName: operationName,
                extraData: JSON.stringify(extraData)
            });
            return response
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }

    async getAllPerformanceLoggingForOperation(operation:string){
        try{
            let documents = []

            let results = await this.database.listDocuments(this.PERFORMANCE_LOGGING_COLLECTION_ID, [
                 Query.equal('operationName', operation),
             ], 100);
             documents.push(...results.documents)
             this.log.info(results.sum);
             const lastId = results.documents[results.documents.length - 1].$id;

            return results.documents
        } catch(err){
            this.log.error("error: " + err);
            throw err;
        }
    }
}
