export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  blockchainNodeUrl: process.env.BLOCKCHAIN_NODE_URL || "http://eos1.anthonybrochu.com:8888"
});
