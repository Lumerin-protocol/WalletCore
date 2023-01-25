//@ts-check
const axios = require('axios').default

/**
 * Returns ETH and LMR prices in USD from coingecko api
 * @returns {Promise<{ LMR: number, ETH: number}>}
 */
const getRateKucoin = async () => {
  const baseUrl = 'https://api.kucoin.com/api'

  const [LMR, ETH] = await Promise.all(
    ['LMR-USDT', 'ETH-USDT'].map(async (pair) => {
      const res = await axios.get(`${baseUrl}/v1/market/orderbook/level1`, {
        params: {
          symbol: pair,
        },
      })

      const price = Number(res?.data?.data?.price)
      if (!price) {
        throw new Error(
          `invalid price response for ${pair} from kucoin: ${res.data}`
        )
      }
      return price
    })
  )

  return { LMR, ETH }
}

module.exports = { getRateKucoin }
