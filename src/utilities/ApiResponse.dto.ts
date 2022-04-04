import { NfticketTransactionObject } from "./NfticketTransactionObject.dto";

export default class ApiResponse {
    success: boolean;
    data?: any;
    errorMessage?: string;
}

export class ApiTransactionsActionsResponse extends ApiResponse {
    data?: NfticketTransactionObject;
}