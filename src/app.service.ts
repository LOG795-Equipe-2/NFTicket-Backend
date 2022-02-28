import { Injectable } from '@nestjs/common';

import { GetTableRowsResult } from 'eosjs/dist/eosjs-rpc-interfaces';
import { AtomicAssetsQueryService } from './service/AtomicAssetsQueryService';

import { ConfigService } from '@nestjs/config';

// TODO (in the future): 
// Update the fetching of data using the AtomicAssetsAPI.
// For now, we query the blockchain in a raw manner, but we could use the following js:
// https://github.com/pinknetworkx/atomicassets-js
//
// But, in order to do that, we also need this:
// https://github.com/pinknetworkx/eosio-contract-api
// Which is an interface API for the blockchain
//
// The advantages might be more performance, but we will leave that for later.
//

const fetch = require('node-fetch'); // node only; not needed in browsers

@Injectable()
export class AppService {

  atomicService: AtomicAssetsQueryService;

  constructor(private configService: ConfigService){
      this.atomicService = new AtomicAssetsQueryService(configService.get<string>('blockchainNodeUrl'));
  }

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * This method proposes a example way of executing a transaction on the blockchain does not require
   * auth.
   * 
   * @returns 
   */
  async getTestEOSJs(): Promise<string> {
    let response3
    await (async () => {
      let response2 = await this.atomicService.getSchemas('nftikanthony');
      // console.log(this.ticketSchema);
      response3 = await this.atomicService.getTemplates('nftikanthony');

      let response: GetTableRowsResult = await this.atomicService.getAssets('anthony');

      console.log(response3); 
    })()

    return response3;
  }
}
