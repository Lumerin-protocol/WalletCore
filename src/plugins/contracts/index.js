//@ts-check
'use strict'

const logger = require('../../logger')
const { Lumerin, CloneFactory } = require('contracts-js')

const {
  createContract,
  cancelContract,
  purchaseContract,
  setContractDeleteStatus,
  editContract,
  getMarketplaceFee,
} = require('./api')
const { Indexer } = require('./indexer')

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin() {
  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ api: {[key: string]:any}, events: string[], name: string }} The instance details.
   */
  function start({ config, eventBus, plugins }) {
    const {
      lmrTokenAddress,
      cloneFactoryAddress,
      indexerUrl,
      pollingInterval,
    } = config
    const { eth } = plugins

    const web3 = eth.web3

    const lumerin = Lumerin(web3, lmrTokenAddress)
    const cloneFactory = CloneFactory(web3, cloneFactoryAddress)

    const indexer = new Indexer(indexerUrl)

    const refreshContracts = async (contractId, walletAddress) => {
      if (walletAddress) {
        Indexer.walletAddr = walletAddress
      }
      eventBus.emit('contracts-scan-started', {})

      try {
        const contracts = contractId
          ? await indexer.getContract(contractId)
          : await indexer.getContracts()

        eventBus.emit('contracts-scan-finished', {
          actives: contracts,
        })
      } catch (error) {
        logger.error(
          `Could not sync contracts/events, params: ${contractId}, error:`,
          error
        )
        throw error
      }
    }

    setInterval(() => {
      refreshContracts()
    }, pollingInterval)

    const wrapAction = (fn) => async (params) => {
      const contractId = params?.contractId
      const result = await fn(params)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await refreshContracts(contractId).catch((error) => {
        logger.error('Error refreshing contracts', error)
      })
      return result
    }

    const purchaseContractFn = purchaseContract(web3, cloneFactory, lumerin)
    const cancelContractFn = cancelContract(web3, cloneFactory)
    return {
      api: {
        refreshContracts,
        createContract: wrapAction(createContract(web3, cloneFactory)),
        cancelContract: wrapAction(cancelContractFn),
        purchaseContract: wrapAction(purchaseContractFn),
        editContract: wrapAction(editContract(web3, cloneFactory, lumerin)),
        getMarketplaceFee: getMarketplaceFee(cloneFactory),
        setContractDeleteStatus: wrapAction(
          setContractDeleteStatus(web3, cloneFactory)
        ),
      },
      events: [
        'contracts-scan-started',
        'contracts-scan-finished',
        'contract-updated',
      ],
      name: 'contracts',
    }
  }

  /**
   * Stop the plugin instance.
   */
  function stop() {
    logger.debug('Plugin stopping')
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
