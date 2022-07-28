// require('ts-node/register/transpile-only')

// const HDWalletProvider = require('@truffle/hdwallet-provider')
// const mnemonic = 'digital unknown jealous mother legal hedgehog save glory december universe spread figure custom found six'
//
// const secretMnemonicFile = './secret_mnemonic'
// const fs = require('fs')
// let secretMnemonic
// if (fs.existsSync(secretMnemonicFile)) {
//   secretMnemonic = fs.readFileSync(secretMnemonicFile, { encoding: 'utf8' })
// }

module.exports = {
  networks: {
    development: {
      provider: undefined,
      verbose: process.env.VERBOSE,
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: '0.8.1',
      settings: {
        evmVersion: 'istanbul',
        optimizer: {
          enabled: true,
          runs: 200 // Optimize for how many times you intend to run the code
        }
      }
    }
  }
}
