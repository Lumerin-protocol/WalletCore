const { BlockscoutApi } = require('./blockscout-api');

const createBlockscoutApi = (chainId) => {
  let baseURL

  switch (chainId.toString()) {
    case 'mainnet':
    case '1':
      baseURL = 'https://blockscout.com/eth/mainnet/api'
      break
    case 'goerli':
    case '5':
      baseURL = 'https://eth-goerli.blockscout.com/api'
      break
    default:
      throw new Error(`Unsupported chain ${chainId}`)
  }

  return new BlockscoutApi({baseURL})
}

module.exports = { createBlockscoutApi }