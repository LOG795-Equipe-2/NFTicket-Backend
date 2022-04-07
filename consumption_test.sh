#!/bin/bash
#
# Script to automate ticket minting for consumption usage purposes
# Requires a testnet to be configured properly, appropriate columns/schemas/templates from NFTIcket and "jq" to be configured.
# Optional: Can send a message over on telegram if necessary when execution is over
# Note: For long iterations, consider increasing the unlock-timeout of keosd

EOS_ENDPOINT="http://your-blockchain-endpoint"
ACCOUNT_NAME="account_name"
AUTHORIZED_MINTER=\"${ACCOUNT_NAME}\"
COLLECTION_NAME=\"${ACCOUNT_NAME}\"
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

INITIAL_CPU_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .cpu_limit.available')
INITIAL_NET_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .net_limit.available')
INITIAL_RAM_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .ram_usage')

SECONDS=0
for ((i=0; i < $NB_TICKETS; i++))
do
    cleos --url=$EOS_ENDPOINT push action atomicassets mintasset '['"$AUTHORIZED_MINTER"', '"$COLLECTION_NAME"', '"$SCHEMA_NAME"', '"$TEMPLATE_ID"', '"$NEW_ASSET_OWNER"', '"$IMMUTABLE_DATA"', '"$MUTABLE_DATA"', []]' -f -p $ACCOUNT_NAME@active >/dev/null 2>&1
    if [ $(($i % 100)) -eq 0 ]; then
     echo "to iteration: "$i
    fi
done
DURATION=$SECONDS

FINAL_CPU_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .cpu_limit.available')
FINAL_NET_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .net_limit.available')
FINAL_RAM_USAGE=$(cleos --url=$EOS_ENDPOINT get account $ACCOUNT_NAME --json | jq -r '. | .ram_usage')

let CPU_CONSUMED=$INITIAL_CPU_USAGE-$FINAL_CPU_USAGE
let NET_CONSUMED=$INITIAL_NET_USAGE-$FINAL_NET_USAGE
let RAM_CONSUMED=$FINAL_RAM_USAGE-$INITIAL_RAM_USAGE

echo "CPU consumed: $CPU_CONSUMED µs"
echo "NET consumed: $NET_CONSUMED bytes"
echo "RAM consumed: $RAM_CONSUMED bytes"
echo "Total duration time in seconds: $DURATION"

curl --data-urlencode "chat_id=709432417" \
     --data-urlencode "text=The consumption test for $NB_TICKETS tickets is done on server $HOSTNAME
     
CPU consumed: $CPU_CONSUMED µs
NET consumed: $NET_CONSUMED bytes
RAM consumed: $RAM_CONSUMED bytes