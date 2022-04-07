import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JsonRpc } from 'eosjs';
import { GetTableRowsResult } from 'eosjs/dist/eosjs-rpc-interfaces';
import {  deserialize, ObjectSchema } from "atomicassets"
import { hexToUint8Array } from 'eosjs/dist/eosjs-serialize';
import fetch from 'node-fetch'; // node only; not needed in browsers
import { Logger } from "tslog";

import * as TICKET_SCHEMA from '../schemas/ticketSchema.json'; // this ts file should still be imported fine

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
@Injectable()
export class AtomicAssetsQueryService {
  log: Logger = new Logger({ name: "AtomicAssetsQueryServiceLogger"})

  rpc: JsonRpc;
  ticketSchema;
  templatesCache = [];

  constructor(private configService: ConfigService){
      let nodeUrl: string = configService.get<string>('blockchainNodeUrl')

      this.rpc = new JsonRpc(nodeUrl, { fetch });
      try{
        //This might be replaced by a Database Item
        this.ticketSchema = ObjectSchema(TICKET_SCHEMA);
      } catch(err){
        this.log.error(`Error reading file from disk: ${err}`)
      }
  }

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
      upper_bound: collName,
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
   * 
   * Uses cache logic to prevent spamming blockchain server.
   */
   async getTemplates(collName, templateId = null, limit = 100, reverse = false) {
     let response;
    if(this.templatesCache[templateId]){
      response = JSON.parse(JSON.stringify(this.templatesCache[templateId]))
    } else {
      response = await this.rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'atomicassets',      // Contract that we target
        scope: collName,      // Account that owns the data
        table: 'templates',        // Table name
        lower_bound: templateId,     // Table primary key value
        limit: limit,                // Maximum number of rows that we want to get
        reverse: reverse,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      });
      if(templateId){
        this.templatesCache[templateId] = JSON.parse(JSON.stringify(response))
      }
    }
    
    //Deserialize data
    response.rows.forEach((element) => {
      try{
        element.immutable_serialized_data = this.deserializeData(element.immutable_serialized_data, this.ticketSchema);
      } catch(err){
        this.log.warn("error while deserialising immutable data from template, not following expected schema: " + err);
      }
    });

    return response
  }

  /**
   * Return all the templates for a specific collection
   * If no schemaName is provided, all schemas are returned
   */
  async getAssets(user, limit = 100, reverse = false, lower_bound = null): Promise<GetTableRowsResult> {
    let rowsSaved = []

    let response = await this.rpc.get_table_rows({
      json: true,               // Get the response as json
      code: 'atomicassets',      // Contract that we target
      scope: user,      // Account that owns the data
      table: 'assets',        // Table name
      lower_bound: lower_bound,     // Table primary key value
      upper_bound: null,
      limit: limit,                // Maximum number of rows that we want to get
      reverse: reverse,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });

    rowsSaved.push(...response.rows)

    while(response.more && rowsSaved.length < limit){
      response = await this.rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'atomicassets',      // Contract that we target
        scope: user,      // Account that owns the data
        table: 'assets',        // Table name
        lower_bound: response.next_key,     // Table primary key value
        upper_bound: null,
        limit: limit,                // Maximum number of rows that we want to get
        reverse: reverse,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      });
      rowsSaved.push(...response.rows)
    }

    response.rows = rowsSaved

    //Deserialize data
    response.rows.forEach((element) => {
      try{
        element.immutable_serialized_data = this.deserializeData(element.immutable_serialized_data, this.ticketSchema);
      } catch(err){
        this.log.warn("error while deserialising immutable data, not following expected schema: " + err);
      }

      try{
        element.mutable_serialized_data = this.deserializeData(element.mutable_serialized_data, this.ticketSchema);
      } catch(err){
        this.log.warn("error while deserialising mutable data, not following expected schema: " + err);
      }
    });

    return response
  }

  /**
   * Deserialize a particular set of data that is coming from the EOS blockchain.
   * 
   * Depending of if the data is a hex string or a Uint8Array, it will convert it to an object.
   * @param data 
   * @param schema 
   * @returns 
   */
  deserializeData(data, schema){
    let deserializedData
    /**
     * It seems that a different node returns object directly as Uint8array, 
     * so depending on the response, we will manage the deserialization differently.
     */
    if(typeof(data) == 'string'){
      deserializedData = deserialize(hexToUint8Array(data), schema)
    } else {
      deserializedData = deserialize(data, schema)
    }
    return deserializedData
  }

}