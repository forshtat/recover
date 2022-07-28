import commander from 'commander'
import { FlashbotsClient } from './FlashbotsClient'

commander.option('--infura string', 'inf', 'inf')
  .parse(process.argv);

(async () => {
  const fb = new FlashbotsClient()
  await fb.init()
})().catch((reason: any) => {
    console.error(reason)
    process.exit(1)
  }
)
