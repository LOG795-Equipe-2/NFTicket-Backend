import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpc } from 'eosjs';
import { GetAccountResult } from 'eosjs/dist/eosjs-rpc-interfaces';
import fetch from 'node-fetch';

@Injectable()
export class EosService {
    public static readonly UNKNOWN_KEY_ERROR = "UnknownKeyError";

    constructor(private configService: ConfigService) {}
    private readonly rpc = new JsonRpc(this.configService.get<string>('EOS_BLOCKCHAIN_ENDPOINT'), { fetch });

    async getAccountInfo(name: string): Promise<GetAccountResult> {
        try {
            return await this.rpc.get_account(name);
        } catch (e) {
            let error: Error;
            if (e.message.includes("unknown key")) {
                error = new Error("The account name could not be found");
                error.name = EosService.UNKNOWN_KEY_ERROR;
            }
            throw error;
        };
    }

}
