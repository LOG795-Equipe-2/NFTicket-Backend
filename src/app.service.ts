import { Injectable } from '@nestjs/common';

import { Api, JsonRpc, RpcError } from 'eosjs';
import { TransactResult } from 'eosjs/dist/eosjs-api-interfaces';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'; // development only

const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util'); // node only; native TextEncoder/Decoder

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }


  /**
   * This method proposes a example way of executing a transaction on the blockchain that 
   * is hosted on the server. Note, a blockchain must be running, with an
   * account Alice and the contract "addressbook".
   * @returns 
   */
  getTestEOSJs(): string {
    const defaultPrivateKey = "5JsfBNPgg25DV2uMp21fW4cqnJMiY7H4KTjiBXY2qVTtj9kRkqr"; // alice
    const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

    const rpc = new JsonRpc('http://127.0.0.1:8888', { fetch });


    const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

    (async () => {
      try{
        const result = await api.transact({
          actions: [{
            account: 'addressbook',
            name: 'upsert',
            authorization: [{
              actor: 'alice',
              permission: 'active',
            }],
            data: {
              user: 'alice',
              first_name: 'alice',
              last_name: 'liddell',
              age: 24,
              street: '123 drink me way',
              city: 'wonderland',
              state: 'amsterdam'
            },
          }]
        }, {
          blocksBehind: 3,
          expireSeconds: 30,
        }) as TransactResult;
        console.dir(result);
        console.dir(result.processed.action_traces);
      } catch(e){
        console.log('\nCaught exception: ' + e);
        if (e instanceof RpcError)
          console.log(JSON.stringify(e.json, null, 2));
      }
    })();

    return 'Hello World EOS!';
  }
}
