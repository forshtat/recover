import {
  FlashbotsBundleResolution,
  FlashbotsBundleProvider,
  FlashbotsTransaction,
  GetUserStatsResponse,
  FlashbotsBundleTransaction,
  SimulationResponse
} from '@flashbots/ethers-provider-bundle'
import { BaseProvider, TransactionRequest } from '@ethersproject/providers'
import { ContractFactory, ethers, Signer, Contract } from 'ethers'

import RecoveryApi from '../build/contracts/Recovery.json'
import IERC20 from '../build/contracts/IERC20.json'

const USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

// todo temp address
const newTokenHolder = '0x9fEd1d68D665321888B5C1bdB734a5C35ccDEA88'
const usdtBalance = 169989859579

export class FlashbotsClient {
  private flashbotsProvider!: FlashbotsBundleProvider
  ethersProvider!: BaseProvider

  ethPrivateKey: string = process.env.ETH_PRIV ?? ''
  usdtPrivateKey: string = process.env.USDT_PRIV ?? ''
  flashbotsPrivateKey: string = '0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773'

  authSigner!: Signer
  ethSigner!: Signer
  usdtSigner!: Signer

  async init (
    url: string,
    flashbotsRelayUrl: string
  ): Promise<this> {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(url)
    this.authSigner = new ethers.Wallet(this.flashbotsPrivateKey, this.ethersProvider)
    this.ethSigner = new ethers.Wallet(this.ethPrivateKey, this.ethersProvider)
    this.usdtSigner = new ethers.Wallet(this.usdtPrivateKey, this.ethersProvider)
    this.flashbotsProvider = await FlashbotsBundleProvider.create(this.ethersProvider, this.authSigner, flashbotsRelayUrl)
    return this
  }

  async getSendEthTransaction (): Promise<TransactionRequest> {
    console.log('sendEth')
    const req: TransactionRequest =
      {
        from: await this.ethSigner.getAddress(),
        to: await this.usdtSigner.getAddress(),
        value: '0x' + 1e15.toString(16),
        gasPrice: '0x2540be400',
        chainId: 1,
        gasLimit: '0x5208'
      }
      return req
  }

  async getRecoverTransaction (): Promise<TransactionRequest> {
    console.log('recoverTx')
    // const usdt = await new Contract(USDT_CONTRACT_ADDRESS, IERC20.abi, this.ethersProvider)
    const erc20 = new ethers.utils.Interface(IERC20.abi)
    // todo:  temp address
    const data = erc20.encodeFunctionData('transfer', [newTokenHolder, usdtBalance])
    const req: TransactionRequest =
      {
        from: await this.usdtSigner.getAddress(),
        to: USDT_CONTRACT_ADDRESS,
        gasPrice: '0x2540be400',
        chainId: 1,
        gasLimit: '0x' + 1e6.toString(16),
        data
      }
    return req
  }

  async getCompensateFlashbotsTransaction (recoveryAddress: string): Promise<TransactionRequest> {
    console.log('compEth')
    const recovery = new ethers.utils.Interface(RecoveryApi.abi)
    const data = recovery.encodeFunctionData('payToMiner', [newTokenHolder, USDT_CONTRACT_ADDRESS, usdtBalance])
    const req: TransactionRequest =
      {
        from: await this.ethSigner.getAddress(),
        to: recoveryAddress,
        value: '0x' + 2e16.toString(16),
        chainId: 1,
        gasLimit: '0x' + 5e5.toString(16),
        gasPrice: '0x2540be400',
        data
      }
    return req
  }

  async deployRecovery () {
    const recipient = await new ContractFactory(RecoveryApi.abi, RecoveryApi.bytecode, this.ethSigner).deploy()
    console.log('Recovery helper contract deployed', recipient.address)
  }

  /**
   * @return string[] - array of signed raw transactions in a bundle
   * @param transactions - array of transactions to sign
   */
  async signBundle ([transferEth, recoverUsdt, payMiner]: TransactionRequest[]): Promise<string[]> {
    console.log('signBundle')
    const bundle: FlashbotsBundleTransaction[] = [
      {
        transaction: transferEth,
        signer: this.ethSigner
      },
      {
        transaction: recoverUsdt,
        signer: this.usdtSigner
      },
      {
        transaction: payMiner,
        signer: this.ethSigner
      }
    ]
    return await this.flashbotsProvider.signBundle(bundle)
  }

  async sendBundle (signedBundle: string[], fromBlock: number, toBlock: number): Promise<FlashbotsTransaction> {
    let isResolved = false
    return await new Promise((resolve, reject) => {
      for (let block = fromBlock; block <= toBlock; block++) {
        this.flashbotsProvider.sendRawBundle(signedBundle, block)
          .then((flashbotsTransaction) => {
            if (block === fromBlock) {
              console.log('transaction:', JSON.stringify(flashbotsTransaction))
            }
            console.log('submitted transaction for block', block)
            if ('error' in flashbotsTransaction) {
              reject(flashbotsTransaction.error)
              return
            }
            flashbotsTransaction.wait().then((bundleResolution: FlashbotsBundleResolution) => {
              console.log('bundleResolution for block:', block, ' : ', JSON.stringify(bundleResolution), 'BundleIncluded(0), BlockPassedWithoutInclusion(1), AccountNonceTooHigh(2)', isResolved)
              if (isResolved) {
                return
              }
              if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
                isResolved = true
                resolve(flashbotsTransaction)
              } else if (block === toBlock && bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
                isResolved = true
                reject(new Error('Flashbots failed with AccountNonceTooHigh error - check if transaction is mined manually'))
              } else if (block === toBlock && bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
                isResolved = true
                reject(new Error('Flashbots failed to include the transaction in target block'))
              }
            })
              .catch((error) => reject(error))
          })
          .catch((error) => reject(error))
      }
    })
  }

  async simulateBundle (signedBundle: string[]): Promise<SimulationResponse> {
    return await this.flashbotsProvider.simulate(signedBundle, 'latest')
  }

  async getUserStats (): Promise<GetUserStatsResponse> {
    return await this.flashbotsProvider.getUserStats()
  }
}
