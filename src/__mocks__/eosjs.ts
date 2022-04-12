class Api {
    deserializeActions(actions): Promise<any[]>{
        return Promise.resolve(JSON.parse(actions))
    }
    deserializeTransaction(transaction: Uint8Array): any {
        var enc = new TextDecoder(); // always utf-8
        var actions = enc.decode(transaction);

        return {
            actions: actions
        }
    }
}

import { JsonRpc } from 'eosjs/dist/eosjs-jsonrpc'
import * as ApiInterfaces from 'eosjs/dist/eosjs-api-interfaces';
import * as Numeric from 'eosjs/dist/eosjs-numeric';
import * as RpcInterfaces from 'eosjs/dist/eosjs-rpc-interfaces';
import { RpcError } from 'eosjs/dist/eosjs-rpcerror';
import * as Serialize from 'eosjs/dist/eosjs-serialize';
export { Api, ApiInterfaces, JsonRpc, Numeric, RpcInterfaces, RpcError, Serialize };
