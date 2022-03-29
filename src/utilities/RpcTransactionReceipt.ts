export enum BlockchainTransactionStatus {
    EXECUTED = "executed",
    SOFT_FAIL = "soft_fail",
    HARD_FAIL = "hard_fail",
    DELAYED = "delayed",
    EXPIRED = "expired"
}


export interface RpcTransactionReceipt{
    status: BlockchainTransactionStatus,
    cpu_usage_us: number,
    net_usage_words: number
}

export interface RpcTransactionInformation{

}