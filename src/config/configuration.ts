export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  blockchainNodeUrl: process.env.BLOCKCHAIN_NODE_URL || "http://eos1.anthonybrochu.com:8888",
  chainId: process.env.CHAIN_ID || "5d5bbe6bb403e5ca8b087d382946807246b4dee094c7f5961e2bebd88f8c9c51",
  appName: process.env.APP_NAME || "NFTicket",
  atomicAssetContractAccountName: process.env.ATOMIC_CONTRACT_NAME || "atomicassets",
  tempAccountOwnerAssets: process.env.TEMP_ACCOUNT_OWNER_ASSETS || "atomicassets"
});
