import { SignatureProvider, SignatureProviderArgs } from 'eosjs/dist/eosjs-api-interfaces';
import { PushTransactionArgs } from 'eosjs/dist/eosjs-rpc-interfaces';
import { PrivateKey } from 'eosjs/dist/eosjs-key-conversions';
import { ec } from 'elliptic';

/**
 * SignatureProvider modified for application implementation.
 * 
 * The reason why we don't just use JsSignatureProvider is to prevent
 * losing the private key if there is ever a change or a hack of the lib.
 * 
 * However, the code is very similar.
 * Source: https://github.com/EOSIO/eosjs/blob/master/src/eosjs-jssig.ts
 */
export default class NfticketSignatureProvider implements SignatureProvider {
    public keys = []

    /** expensive to construct; so we do it once and reuse it */
    defaultEc = new ec('secp256k1');

    /** Construct the digest from transaction details */
    digestFromSerializedData = (
        chainId: string,
        serializedTransaction: Uint8Array,
        serializedContextFreeData?: Uint8Array,
        e = this.defaultEc): string => {
        const signBuf = Buffer.concat([
            Buffer.from(chainId, 'hex'),
            Buffer.from(serializedTransaction),
            Buffer.from(
                serializedContextFreeData ?
                    new Uint8Array(e.hash().update(serializedContextFreeData).digest()) :
                    new Uint8Array(32)
            ),
        ]);
        return e.hash().update(signBuf).digest();
    };

    /** Sign a transaction */
    async sign(
        { chainId, requiredKeys, serializedTransaction, serializedContextFreeData }: SignatureProviderArgs
    ): Promise<PushTransactionArgs> {
        const digest = this.digestFromSerializedData( chainId, serializedTransaction, serializedContextFreeData);
        const signatures = [] as string[];
        for (const key of requiredKeys) {
            let privateKey = PrivateKey.fromString(key)
            this.keys.push(privateKey.getPublicKey())
            const signature = privateKey.sign(digest, false);
            signatures.push(signature.toString());
        }

        return { signatures, serializedTransaction, serializedContextFreeData };
    }

    getAvailableKeys(): Promise<string[]> {
        let keys = []
        for(let key in this.keys){
            keys.push(key.toString())
        }
        return new Promise((resolve, reject) => {
            resolve(keys);
          });
    };

}