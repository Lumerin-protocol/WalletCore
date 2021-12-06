'use strict';

const { CookieJar } = require('tough-cookie');
const { create: createAxios } = require('axios');
const { default: axiosCookieJarSupport } = require('axios-cookiejar-support');
const { isArrayLike } = require('lodash');
const debug = require('debug')('lmr-wallet:core:explorer:connection-manager');
const EventEmitter = require('events');
const io = require('socket.io-client');
const pRetry = require('p-retry');

/**
 * Create an object to interact with the Lumerin indexer.
 *
 * @param {object} config The configuration object.
 * @param {object} eventBus The corss-plugin event bus.
 * @returns {object} The exposed indexer API.
 */
function createConnectionManager (config) {
  const { chainId, debug: enableDebug, indexerUrl, useNativeCookieJar } = config;
  const { CONNECTION_MANAGER_URL } = process.env;

  debug.enabled = enableDebug;

  let axios;
  let jar;
  let socket;

  if (useNativeCookieJar) {
    axios = createAxios({
      baseURL: CONNECTION_MANAGER_URL
    });
  } else {
    jar = new CookieJar();
    axios = axiosCookieJarSupport(createAxios(({
      baseURL: CONNECTION_MANAGER_URL,
      withCredentials: true
    })));
    axios.defaults.jar = jar;
  }

  const getConnections = () =>
    axios('/connection')
      .then(res => res.data);
      // .then(best =>
      //   best && best.number && best.hash
      //     ? best
      //     : new Error('Indexer\' response is invalid for best block')
      // );

  const getCookiePromise = useNativeCookieJar
    ? Promise.resolve()
    : pRetry(
      () =>
        getBestBlock()
          .then(function () {
            debug('Got indexer cookie')
          }),
      {
        forever: true,
        maxTimeout: 5000,
        onFailedAttempt (err) {
          debug('Failed to get indexer cookie', err.message)
        }
      }
    );

  const getSocket = () =>
    io(CONNECTION_MANAGER_URL, {
      autoConnect: false,
      extraHeaders: jar
        ? { Cookie: jar.getCookiesSync(CONNECTION_MANAGER_URL).join(';') }
        : {}
    });


  /**
   * Create a stream that will emit an event each time a transaction for the
   * specified address is indexed.
   *
   * The stream will emit `data` for each transaction. If the connection is lost
   * or an error occurs, an `error` event will be emitted. In addition, when the
   * connection is restablished, a `resync` will be emitted.
   *
   * @param {string} address The address.
   * @returns {object} The event emitter.
   */
  function getConnectionsStream (address) {
    const stream = new EventEmitter();

    getCookiePromise
      .then(function () {
        socket = getSocket();

        socket.on('connect', function () {
          debug('Indexer connected');
          eventBus.emit('indexer-connection-status-changed', {
            connected: true
          });
          socket.emit(
            'subscribe',
            { type: 'txs', addresses: [address] },
            function (err) {
              if (err) {
                stream.emit('error', err)
              }
            }
          )
        });

        socket.on('tx', function (data) {
          if (!data) {
            stream.emit('error', new Error('Indexer sent no tx event data'));
            return;
          }

          const { type, txid } = data;

          if (type === 'eth') {
            if (typeof txid !== 'string' || txid.length !== 66) {
              stream.emit('error', new Error('Indexer sent bad tx event data'));
              return;
            }

            stream.emit('data', txid);
          }
        });

        socket.on('disconnect', function (reason) {
          debug('Indexer disconnected');
          eventBus.emit('indexer-connection-status-changed', {
            connected: false
          });
          stream.emit('error', new Error(`Indexer disconnected with ${reason}`));
        })

        socket.on('reconnect', function () {
          stream.emit('resync');
        });

        socket.on('error', function (err) {
          stream.emit('error', err);
        });

        socket.open();
      })
      .catch(function (err) {
        stream.emit('error', err);
      });

    return stream;
  }

  /**
   * Disconnects from the indexer.
   */
  function disconnect () {
    if (socket) {
      socket.close();
    }
  }

  return {
    disconnect,
    // getBestBlock,
    getConnections,
    getConnectionsStream
  };
}

module.exports = createConnectionManager;
