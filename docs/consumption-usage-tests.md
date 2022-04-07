# Tests to measure consumption usage

## Prerequisites

- Configured [EOS testnet](https://developers.eos.io/manuals/eos/v2.1/nodeos/usage/development-environment/local-single-node-testnet) with AtomicAssets.
- Account created on the testnet
- Choosen column name for testing is less than 13 characters.

## Getting Started

1. Unlock wallet
2. Create test column
   `cleos --url=<endpoint-url> push action atomicassets createcol "["<account-name>", "<column-name>", "true", ["<account-name>"], [], 0, []]" -p <account-name>@active`
3. Create test schema (without template)
   `cleos --url=<endpoint-url> push action atomicassets createschema '["<account-name>", "<column-name>", "<schema-name>", [{"name":"name", "type":"string"}, {"name":"locationName", "type":"string"}, {"name":"originalDateTime", "type":"string"}, {"name":"originalPrice", "type":"string"}, {"name":"categoryName", "type":"string"}, {"name":"signed", "type":"bool"}]]' -p <account-name>@active`
4. Create test schema (with template)
   `cleos --url=<endpoint-url> push action atomicassets createschema '["<account-name>", "<column-name>", "<schema-name>", [{"name":"name", "type":"string"}, {"name":"locationName", "type":"string"}, {"name":"originalDateTime", "type": "string"}, {"name":"originalPrice", "type":"string"}, {"name":"categoryName", "type":"string"}, {"name":"signed", "type":"bool"}]]' -p <account-name>@active`
5. Create template for test schema
   `cleos --url=<endpoint-url> push action atomicassets createtempl '["<account-name>", "<column-name>", "<schema-name>", true, true, 0, [{"key":"name", "value":["string", "testName"]}, {"key":"locationName", "value":["string", "testLocation"]}, {"key":"originalDateTime", "value":["string", "2022-02-02"]}, {"key":"originalPrice", "value":["string", "100"]}, {"key":"categoryName", "value":["string", "testCategory"]}]]' -p <account-name>@active`
   
   **Note:** Write the template id somewhere after the transaction has been executed from the command output.

6. Mint asset (without template)
   `cleos --url=<endpoint-url> push action atomicassets mintasset '["<account-name>", "<column-name>", "<schema-name>", -1, "nfticket", [{"key":"name", "value":["string", "testName"]}, {"key":"locationName", "value":["string", "testLocation"]}, {"key":"originalDateTime", "value":["string", "2022-02-02"]}, {"key":"originalPrice", "value":["string", "100"]}, {"key":"categoryName", "value":["string", "testCategory"]}], [{"key":"signed", "value": ["uint8", "0"]}], []]' -p <account-name>@active`
7. Mint asset (with template)
   `cleos --url=<endpoint-url> push action atomicassets mintasset '["<account-name>", "<column-name>", "<schema-name>", 65, "nfticket", [], [{"key":"signed", "value": ["uint8", "0"]}], []]' -p <account-name>@active`

## Testing of large number of tickets

A script `consumption_test.sh` is available at the root of the project so that it is possible to automate minting consumption usage over a large number of ticket. Just as an FYI, it is better to run this against the blockchain server locally to avoid issues with DDoS and additional time due to network latency. Uncomment the relevant sections depending on the situation.