export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  blockchainNodeUrl: process.env.BLOCKCHAIN_NODE_URL || "http://eos1.anthonybrochu.com:8888",
  chainId: process.env.CHAIN_ID || "5d5bbe6bb403e5ca8b087d382946807246b4dee094c7f5961e2bebd88f8c9c51",
  appName: process.env.APP_NAME || "NFTicket",
  atomicAssetContractAccountName: process.env.ATOMIC_CONTRACT_NAME || "atomicassets",
  tempAccountOwnerAssets: process.env.TEMP_ACCOUNT_OWNER_ASSETS || "nfticket",
  tempAccountOwnerPubKey: process.env.TEMP_ACCOUNT_OWNER_PUB_KEY || "EOS5EHh3GixGi8V2Nazh5XB7W8xgbrFJNCBM8Mv13uQYp2antwPf1",
  tempAccountOwnerPrivKey: process.env.TEMP_ACCOUNT_OWNER_PRIV_KEY || "",
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || "https://appwrite.lurent.ca/v1",
  appwriteProjectId: process.env.APPWRITE_PROJECTID || "61fdaf9f85273",
  appwriteSecret: process.env.APPWRITE_SECRET,
  blockchainTokenSymbol: process.env.BLOCKCHAIN_TOKEN_SYMBOL || 'SYS',
  blockchainTransferContractName: process.env.BLOCKCHAIN_TRANSFER_CONTRACT_NAME || 'eosio.token',
  blockchainTokenFixedPrecision: process.env.BLOCKCHAIN_TOKEN_FIXED_PRECISION || 4,

  // Appwrite Tables
  appwriteCollectionIdEvents: process.env.APPWRITE_COLLECTION_ID_EVENTS || "62210e0672c9be723f8b",
  appwriteCollectionIdTicketCategories: process.env.APPWRITE_COLLECTION_ID_TICKET_CATEGORIES || "622111bde1ca95a94544",
  appwriteCollectionIdTickets: process.env.APPWRITE_COLLECTION_ID_TICKETS || "6221134c389c90325a38",
  appwriteCollectionIdEosInfo: process.env.APPWRITE_COLLECTION_ID_EOS_INFO || "621fcb8641b53f76bc95",  
  appwriteCollectionIdTicketCategoriesStylings: process.env.APPWRITE_COLLECTION_ID_TICKET_CATEGORIES_STYLINGS || "622112b4efbb25929545",
  appwriteCollectionIdTransactionsPending: process.env.APPWRITE_COLLECTION_ID_TRANSACTIONS_PENDING || "62432080ee967095751b",
});
