'use strict'

const { create: createAxios } = require('axios')
const debug = require('debug')('lmr-wallet:core:explorer:connection-manager')
const EventEmitter = require('events')

/**
 * Create an object to interact with the Lumerin indexer.
 *
 * @param {object} config The configuration object.
 * @param {object} eventBus The corss-plugin event bus.
 * @returns {object} The exposed indexer API.
 */
function createConnectionsManager(config, eventBus) {
  const { debug: enableDebug, proxyRouterUrl } = config
  const pollingInterval = 5000;

  debug.enabled = enableDebug

  const axios = createAxios({
    baseURL: proxyRouterUrl,
  })

  let interval

  const getConnections = () => axios('/miners').then((res) => res.data.Miners)

  /**
   * Create a stream that will emit an event each time a connection is published to the proxy-router
   *
   * The stream will emit `data` for each connection. If the proxy-router connection is lost
   * or an error occurs, an `error` event will be emitted. In addition, when the
   * connection is restablished, a `resync` will be emitted.
   *
   * @returns {object} The event emitter.
   */
  function getConnectionsStream() {
    const stream = new EventEmitter()

    let isConnected = false

    interval = setInterval(() => {
      debug('Attempting to get connections')
      getConnections()
        .then((connections) => {
          if (!isConnected) {
            isConnected = true
            debug('emit proxy-router-status-changed')
            eventBus.emit('proxy-router-status-changed', {
              isConnected,
              syncStatus: 'synced',
            })
          }

          stream.emit('data', {
            connections,
          })
        })
        .catch((err) => {
          isConnected = false
          eventBus.emit('proxy-router-status-changed', {
            isConnected,
            syncStatus: 'syncing',
          })
          eventBus.emit('error', `error fetching connections: ${err}`)
        })
    }, pollingInterval);

    return stream
  }

  /**
   * Disconnects.
   */
  function disconnect() {
    if (interval) {
      clearInterval(interval)
    }
  }

  return {
    disconnect,
    getConnections,
    getConnectionsStream,
  }
}

module.exports = createConnectionsManager
