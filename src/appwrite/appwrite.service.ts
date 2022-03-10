import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Account, AppwriteException, Client, Database, Models, Storage, Users } from "node-appwrite"


@Injectable()
export class AppwriteService {

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
                console.error("invalid jwt");

            console.error(error.message)
            return undefined;
        }
    }
}