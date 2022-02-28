import { JsonRpc } from 'eosjs';
import { GetTableRowsResult } from 'eosjs/dist/eosjs-rpc-interfaces';
import {  deserialize, ObjectSchema } from "atomicassets"
import { hexToUint8Array } from 'eosjs/dist/eosjs-serialize';
import fetch from 'node-fetch'; // node only; not needed in browsers

// TODO: 
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

export class AtomicAssetsService {
  ticketSchema = ObjectSchema([
    { name: 'name', type: 'string' },
    { name: 'id', type: 'int32' },
    { name: 'date', type: 'string' },
    { name: 'hour', type: 'string' },
    { name: 'locationName', type: 'string' },
    { name: 'eventName', type: 'string' },   
    { name: 'rowNo', type: 'string' },
    { name: 'seatNo', type: 'string' }
  ]);

  rpc = new JsonRpc('http://eos1.anthonybrochu.com:8888', { fetch });

  /**
   * Returns a collection from atomicAssets based on a collName Provided
   * If no collName provided, all rows are returned.
   */
  async getCollections(collName = null, limit = 100): Promise<GetTableRowsResult> {
    var response = await this.rpc.get_table_rows({
      json: true,               // Get the response as json
      code: 'atomicassets',      // Contract that we target
      scope: 'atomicassets',      // Account that owns the data
      table: 'collections',        // Table name
      lower_bound: collName,     // Table primary key value
      limit: limit,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });

    return response
  }

  /**
   * Return all the schemas for a specific collection
   * If no schemaName is provided, all schemas are returned
   */
  async getSchemas(collName, schemaName = null, limit = 100): Promise<GetTableRowsResult> {
    var response = await this.rpc.get_table_rows({
      json: true,               // Get the response as json
      code: 'atomicassets',      // Contract that we target
      scope: collName,      // Account that owns the data
      table: 'schemas',        // Table name
      lower_bound: schemaName,     // Table primary key value
      limit: limit,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });

    return response
  }
  
  /**
   * Return all the templates for a specific collection
   * If no schemaName is provided, all schemas are returned
   */
   async getTemplates(collName, templateName = null, limit = 100) {
    var response = await this.rpc.get_table_rows({
      json: true,               // Get the response as json
      code: 'atomicassets',      // Contract that we target
      scope: collName,      // Account that owns the data
      table: 'templates',        // Table name
      lower_bound: templateName,     // Table primary key value
      limit: limit,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    
    //Deserialize data
    response.rows.forEach((element) => {
      element.immutable_serialized_data = deserialize(hexToUint8Array(element.immutable_serialized_data), this.ticketSchema)
    });
    
    return response
  }

  /**
   * Return all the templates for a specific collection
   * If no schemaName is provided, all schemas are returned
   */
  async getAssets(user, limit = 100): Promise<GetTableRowsResult> {
    //let response = await this.api.getAsset(user, "1099511627776")
   /* let response = await this.api.getAsset(user, "1099511627777")
    return response;*/

    var response = await this.rpc.get_table_rows({
      json: true,               // Get the response as json
      code: 'atomicassets',      // Contract that we target
      scope: user,      // Account that owns the data
      table: 'assets',        // Table name
      lower_bound: null,     // Table primary key value
      limit: limit,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });

    //Deserialize data
    response.rows.forEach((element) => {
      element.immutable_serialized_data = deserialize(hexToUint8Array(element.immutable_serialized_data), this.ticketSchema)
      element.mutable_serialized_data = deserialize(hexToUint8Array(element.mutable_serialized_data), this.ticketSchema)
    });
    return response
  }

}