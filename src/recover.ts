import {
  FlashbotsBundleResolution,
  FlashbotsBundleProvider,
  FlashbotsTransaction,
  GetUserStatsResponse,
  SimulationResponse
} from '@flashbots/ethers-provider-bundle'
import { BaseProvider, TransactionRequest } from '@ethersproject/providers'
import { ethers, Signer } from 'ethers'

const infuraApiKey = process.env.INFURA

export class FlashbotsClient {
  private flashbotsProvider!: FlashbotsBundleProvider
  private ethersProvider!: BaseProvider

  ethPrivateKey!: string
  usdtPrivateKey!: string
  flashbotsPrivateKey: string = '0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773'

  async init (
    // accountManager: AccountManager,
    ethersProvider: BaseProvider,
    networkId: number,
    flashbotsRelayUrl: string
  ): Promise<this> {
    this.ethersProvider = new ethers.providers.InfuraProvider('mainnet', infuraApiKey)
    // TODO: authSigner is only used for authentication against the Flashbots relay server, no need to store key for now
    const authSigner = new ethers.Wallet(this.flashbotsPrivateKey)
    this.flashbotsProvider = await FlashbotsBundleProvider.create(this.ethersProvider, authSigner, flashbotsRelayUrl, networkId)
    return this
  }

  /**
   * @return string[] - array of signed raw transactions in a bundle
   * @param transactions - array of transactions to sign
   */
  async signBundle (transactions: TransactionRequest[]): Promise<string[]> {
    const signer = this.getEthersSigner(0)
    const bundle = transactions.map(transaction => { return { signer, transaction } })
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

  async getFlashbotsAccount (): Promise<string> {
    const signer = this.getEthersSigner(0)
    return await signer.getAddress()
  }

  getEthersSigner (index: number): Signer {
    return new ethers.Wallet(this.ethPrivateKey)
  }
}
