import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Database, Teams, Users } from 'node-appwrite';
import { AtomicAssetsQueryService } from '../atomic-assets-query/atomic-assets-query.service';
import { EventModel, Query } from '../interface/appwrite.model';
import { NfticketTransactionService } from '../nfticket-transaction/nfticket-transaction.service';
import { Logger } from 'tslog';
import { NfticketSchemaMutableData } from 'src/nfticket-transaction/DTO/NfticketSchemaMutableData';

@Injectable()
export class BouncerService {

    log: Logger = new Logger({ name: "AppwriteService"})

    private readonly TICKET_CATEGORIES_COLLECTION_ID: string;
    private readonly EOS_INFO_COLLECTION_ID: string;
    private readonly EVENTS_COLLECTION_ID: string;
    private readonly TICKETS_COLLECTION_ID: string;
    private readonly TICKET_CATEGORIES_STYLINGS_COLLECTION_ID: string;
    private readonly TRANSACTIONS_PENDING_COLLECTION_ID: string;

    /**
     * @property This Client has admin access to Appwrite, if you need to do an action on behalf of a user
     * you need to create a new client with the initAccoundClient(); method
     */
    serverClient: Client;
    database: Database;
    users: Users;
    team: Teams;

    constructor(private configService: ConfigService, private atomicAssetsService: AtomicAssetsQueryService,
            private nfticketTransactionService: NfticketTransactionService){
        this.serverClient = new Client();
        this.database = new Database(this.serverClient);
        this.users = new Users(this.serverClient);
        this.team = new Teams(this.serverClient)

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
    }

    async checkIsOwner(eventId: string, userId: string): Promise<boolean> {        
        try {
            const event = await this.database.getDocument<EventModel>(this.EVENTS_COLLECTION_ID, eventId);
            return event.userCreatorId === userId;
        } catch (e) {
            return false;
        }
    }

    async checkIsBouncer(eventId: string, bouncer: string): Promise<boolean> {
        try {
            const event = await this.database.getDocument<EventModel>(this.EVENTS_COLLECTION_ID, eventId);
            return event.bouncers.indexOf(bouncer) !== -1;
        } catch (e) {
            return false;
        }
    }

    async createNewBouncer(eventId: string, amount: number): Promise<string[]> {
        let newBouncers: string[] = [];
        for(let i = 0; i < amount; i++) {
            newBouncers.push(Math.random().toString(16).slice(2))
        }

        try {
            const event = await this.database.getDocument<EventModel>(this.EVENTS_COLLECTION_ID, eventId);
            newBouncers = [...newBouncers, ...event.bouncers];
            await this.database.updateDocument(this.EVENTS_COLLECTION_ID, eventId, { bouncers: newBouncers });
            return newBouncers;
        } catch (e) {
            this.log.error(e)
            return []
        }
    }

    async deleteBouncer(eventId: string, bouncer: string): Promise<boolean> {
        const event = await this.database.getDocument<EventModel>(this.EVENTS_COLLECTION_ID, eventId);
        const bouncers = [...event.bouncers];
        let index = bouncers.indexOf(bouncer);

        if(index === -1)
            return false;

        bouncers.splice(index, 1);
        await this.database.updateDocument(this.EVENTS_COLLECTION_ID, eventId, { bouncers });
        return true;
    }

    async getBouncers(eventId: string): Promise<string[] | undefined> {
        let bouncers = [];
        try {
            bouncers = (await this.database.getDocument<EventModel>(this.EVENTS_COLLECTION_ID, eventId)).bouncers;
        } catch (e) {
            this.log.error(e);
            return undefined;
        }
        
        return bouncers
    }

    async validateAssetIsForEvent(eventId, assetId){
        const dbTicket = await this.database.listDocuments(this.TICKETS_COLLECTION_ID, [
            Query.equal("assetId", assetId)
        ]);
        if(dbTicket.documents.length !== 1){
            return;
        }

        return dbTicket.documents[0]['eventId'] == eventId;
    }

    async getAssetMutableData(assetId, userName): Promise<NfticketSchemaMutableData> {
        let assetMutableData = await this.nfticketTransactionService.getAssetsMutableDataFollowingSchema(userName, assetId);
        return assetMutableData
    }

    async setTicketAsUsed(assetId, userName){
        await this.nfticketTransactionService.setTicketUsedOnBlockchain(assetId, userName)
    }
}
