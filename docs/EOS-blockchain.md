
# Make blockchain transactions

## Execute transactions on the blockchain using EOS js

Documentation: https://developers.eos.io/manuals/eosjs/latest/how-to-guides/index

## Basic Example

```ts
    const defaultPrivateKey = "<private key>";
    const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

    // local url for the node.
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
```

