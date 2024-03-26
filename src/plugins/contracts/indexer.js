const axios = require('axios').default

class Indexer {
  /**
   * @type {string}
   */
  static walletAddr = null

  /**
   *
   * @param {string} url
   */
  constructor(url) {
    this.url = url

    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36`,
    }
  }

  /**
   *
   * @returns {Promise<object[]>}
   */
  getContracts = async () => {
    const params = Indexer.walletAddr ? { walletAddr: Indexer.walletAddr } : {}

    const response = await axios.get(`${this.url}/api/contracts`, {
      params,
      headers: this.headers,
    })
    return this.mapIndexerContracts(response.data)
  }

  /**
   *
   * @param {string} id
   * @returns {Promise<object[]>}
   */
  getContract = async (id) => {
    const params = Indexer.walletAddr ? { walletAddr: Indexer.walletAddr } : {}

    const response = await axios.get(`${this.url}/api/contracts/${id}`, {
      params,
      headers: this.headers,
    })
    return this.mapIndexerContracts([response.data])
  }

  /**
   * @param {object[]} contracts
   */
  mapIndexerContracts(contracts) {
    return contracts.map((c) => {
      return {
        ...c,
        isDead: c.isDeleted,
        encryptedPoolData: c.encrValidatorUrl,
        timestamp: c.startingBlockTimestamp,
        history: c.history.map((h) => ({
          ...h,
          id: c.id,
        })),
      }
    })
  }
}

module.exports = { Indexer }
