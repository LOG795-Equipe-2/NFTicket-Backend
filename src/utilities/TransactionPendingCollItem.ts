
export default interface TransactionPendingCollItem{
    $id?: string,
    eosUserName: string,
    transactionType: string,
    expirationDate: number,
    data: string
}