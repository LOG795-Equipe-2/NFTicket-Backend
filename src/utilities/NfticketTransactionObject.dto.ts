import { EosTransactionRequestObject } from "./EosTransactionRequestObject.dto";
import { IsString, IsNotEmpty } from 'class-validator';

export class NfticketTransactionObject {
    @IsString()
    @IsNotEmpty()
    transactionId?: string;

    @IsNotEmpty()
    signatures?: string[];

    @IsNotEmpty()
    serializedTransaction?: any;

    @IsString()
    transactionType: string;

    transactionsBody: EosTransactionRequestObject[];

    @IsString()
    @IsNotEmpty()
    userName: string;

    @IsString()
    @IsNotEmpty()
    transactionPendingId: string;
}