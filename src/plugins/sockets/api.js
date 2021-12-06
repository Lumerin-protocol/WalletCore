'use strict';

// const LumerinContracts = require('metronome-contracts');
const LumerinContracts = require('@lumerin/contracts');

function addAccount (web3, privateKey) {
  web3.eth.accounts.wallet.create(0)
    .add(web3.eth.accounts.privateKeyToAccount(privateKey));
}

// function buyLmr (web3, chain, logTransaction, metaParsers) {
//   const to = LumerinContracts[chain].Auctions.address;
//   return function (privateKey, { from, value, gas, gasPrice }) {
//     addAccount(web3, privateKey);

//     return web3.eth.getTransactionCount(from, 'pending')
//       .then(nonce =>
//         logTransaction(
//           web3.eth.sendTransaction({ from, to, value, gas, gasPrice, nonce }),
//           from,
//           metaParsers.auction({ returnValues: { refund: '0' } })
//         )
//       );
//   }
// }

// function estimateAuctionGas (web3, chain) {
//   const to = LumerinContracts[chain].Auctions.address;
//   return ({ from, value }) => web3.eth.estimateGas({ from, to, value });
// }

module.exports = {
  // buyLmr,
  // estimateAuctionGas
};
