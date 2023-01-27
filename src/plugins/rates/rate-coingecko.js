//@ts-check
const axios = require('axios').default

/**
 * Returns ETH and LMR prices in USD from coingecko api
 * @returns {Promise<{ LMR: number, ETH: number}>}
 */
const getRateCoingecko = async () => {
  const baseUrl = 'https://api.coingecko.com/api'
  const res = await axios.get(`${baseUrl}/v3/simple/price`, {
    params: {
      ids: 'ethereum,lumerin',
      vs_currencies: 'usd',
    },
  })

  const LMR = res?.data?.lumerin?.usd
  const ETH = res?.data?.ethereum?.usd

  if (!LMR || !ETH) {
    throw new Error(`invalid price response from coingecko: ${res.data}`)
  }
  return { LMR, ETH }
}

module.exports = { getRateCoingecko }
