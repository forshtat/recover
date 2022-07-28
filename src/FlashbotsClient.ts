import commander from 'commander'
import { FlashbotsClient } from './recover'

commander.option('--infura string', 'inf', 'inf')
  .parse(process.argv);

(async () => {
  const fb = new FlashbotsClient()
})().catch((reason: any) => {
    console.error(reason)
    process.exit(1)
  }
)
