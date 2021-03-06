
export class EosTransactionRequestObject {
    account: string
    name: string
    data: AtomicAssetsCreateColActionData 
            | AtomicAssetsCreateSchemaActionData 
            | AtomicAssetsCreateTemplActionData
            | AtomicAssetsAddColAuthActionData
            | EosTokenActionData
}

/**
 * https://github.com/pinknetworkx/atomicassets-contract/wiki/Actions#createcol
 * */
export class AtomicAssetsCreateColActionData {
    author: string
    collection_name: string
    allow_notify: boolean
    authorized_accounts: string[]
    notify_accounts: string[]
    market_fee: number
    data: any[]
}

/**
 * https://github.com/pinknetworkx/atomicassets-contract/wiki/Actions#createschema
 * */
export class AtomicAssetsCreateSchemaActionData {
    authorized_creator: string
    collection_name: string
    schema_name: string
    schema_format: any[]
}

/**
 * https://github.com/pinknetworkx/atomicassets-contract/wiki/Actions#createtempl
 * */
export class AtomicAssetsCreateTemplActionData {
    authorized_creator: string
    collection_name: string
    schema_name: string
    transferable: boolean
    burnable: boolean
    max_supply: number
    immutable_data: any[]
}

/**
 * https://github.com/pinknetworkx/atomicassets-contract/wiki/Actions#addcolauth
 * */
export class AtomicAssetsAddColAuthActionData {
    collection_name: string
    account_to_add: string
}

/*
* https://developers.eos.io/manuals/eosjs/v22.1/how-to-guides/how-to-transfer-an-eosio-token
* https://github.com/EOSIO/eosio.contracts/blob/52fbd4ac7e6c38c558302c48d00469a4bed35f7c/contracts/eosio.token/include/eosio.token/eosio.token.hpp#L83
* */
export class EosTokenActionData {
    from: string
    to: string
    quantity: string
    memo: string
}