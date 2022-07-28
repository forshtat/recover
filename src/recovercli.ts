import commander from 'commander'
import { FlashbotsClient } from './FlashbotsClient'

commander
  .option('-d, --deploy','deploy recovery contract')
  .option('--dry','')
  .option('--url <string>','')
  .option('--flashUrl <string>','', 'https://blah')
  .option('--recovery <string>','', '0xblah')
  .parse(process.argv);

(async () => {
  console.log(commander.url, commander.dry, commander.flashUrl)
  if (!process.env.ETH_PRIV || !process.env.USDT_PRIV) {
    console.log('must include private keys')
    return
  }
  const fb = new FlashbotsClient()
  await fb.init(commander.url, commander.flashUrl)

  if (commander.deploy) {
    await fb.deployRecovery()
    return
  }
  if (commander.dry) {
    const ethTx = await fb.getSendEthTransaction()
    const recoverTx = await fb.getRecoverTransaction()
    const compTx = await fb.getCompensateFlashbotsTransaction(commander.recovery)
    const bundle = await fb.signBundle([ethTx, recoverTx, compTx])
    console.log('sendEth')
    console.log(await fb.ethersProvider.sendTransaction(bundle[0]))
    console.log('recover')
    console.log(await fb.ethersProvider.sendTransaction(bundle[1]))
    console.log('comp')
    console.log(await fb.ethersProvider.sendTransaction(bundle[2]))
    return
  }
})().catch((reason: any) => {
    console.error(reason)
    process.exit(1)
  }
)
