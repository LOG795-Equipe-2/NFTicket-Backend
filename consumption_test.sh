#!/bin/bash
#
# Script to automate ticket minting for consumption usage purposes
# Requires a testnet to be configured properly, appropriate columns/schemas/templates from NFTIcket and "jq" to be configured.
# Optional: Can send a message over on telegram if necessary when execution is over
# Note: For long iterations, consider increasing the unlock-timeout of keosd

EOS_ENDPOINT="http://your-blockchain-endpoint"
ACCOUNT_NAME="account-name"
AUTHORIZED_MINTER=\"${ACCOUNT_NAME}\"
COLLECTION_NAME=\"collection-name\"
NEW_ASSET_OWNER=\"${ACCOUNT_NAME}\"
# Template-based asset minting
#SCHEMA_NAME=\"withtemplate\"
#TEMPLATE_ID=1
#IMMUTABLE_DATA='[]'
# Non-template-based asset minting
#SCHEMA_NAME=\"notemplate\"
#TEMPLATE_ID=-1
#IMMUTABLE_DATA='[{"key":"name", "value":["string", "testName"]}, {"key":"locationName", "value":["string", "testLocation"]}, {"key":"originalDateTime", "value":["string", "2022-02-02"]}, {"key":"originalPrice", "value":["string", "100"]}, {"key":"categoryName", "value":["string", "testCategory"]}]'
MUTABLE_DATA='[{"key":"signed", "value": ["uint8", "0"]}]'
NB_TICKETS=1

INITIAL_RAM_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .ram_usage')
CPU_USAGE=0
NET_USAGE=0

SECONDS=0
for ((i=0; i < $NB_TICKETS; i++))
do
   CPU_NET_DATA=$(cleos --url=$EOS_ENDPOINT push action atomicassets mintasset '['"$AUTHORIZED_MINTER"', '"$COLLECTION_NAME"', '"$SCHEMA_NAME"', '"$TEMPLATE_ID"', '"$NEW_ASSET_OWNER"', '"$IMMUTABLE_DATA"', '"$MUTABLE_DATA"', []]' --json -f -p $ACCOUNT_NAME@active | jq -r '. | .processed.receipt.cpu_usage_us, .processed.net_usage' | tr '\n' ' ')
   CPU_USAGE=$((CPU_USAGE+$(echo $CPU_NET_DATA | cut -d ' ' -f1)))
   NET_USAGE=$((NET_USAGE+$(echo $CPU_NET_DATA | cut -d ' ' -f2)))
    if [ $(($i % 100)) -eq 0 ]; then
     echo "to iteration: "$i
    fi
done
DURATION=$SECONDS

FINAL_RAM_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .ram_usage')
let RAM_USAGE=$FINAL_RAM_USAGE-$INITIAL_RAM_USAGE

echo "CPU consumed: $CPU_USAGE µs"
echo "NET consumed: $NET_USAGE bytes"
echo "RAM consumed: $RAM_USAGE bytes"
echo "Total duration time in seconds: $DURATION"