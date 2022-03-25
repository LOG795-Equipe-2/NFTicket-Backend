import { Injectable } from '@nestjs/common';

import { GetTableRowsResult } from 'eosjs/dist/eosjs-rpc-interfaces';
import { AtomicAssetsQueryService } from './atomic-assets-query/atomic-assets-query.service';

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

  constructor(private configService: ConfigService, private atomicService: AtomicAssetsQueryService){
  }

  getHello(): string {
    return 'Hello World!';
  }
}
