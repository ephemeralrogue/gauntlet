# API Ideas

```ts
import * as D from 'discord.js'
import * as DM from 'discord.js-mock'

const backend: DM.Backend = new DM.Backend()

const data: DM.Data = {
  user: {username: 'Comrade Pingu', discriminator: '0323'},
  guilds: {1: {
    channels: [{id: '2', type: DM.ChannelType.GUILD_TEXT}]
  }}
}

const client = new D.Client()
DM.mockClient(backend, client, data)
// or
const client: DM.Client = new DM.Client(backend, {intents: []}, data)

const user: DM.User = new DM.User(
  backend,
  {username: 'cherryblossom', discriminator: '2661'}
)

const channel = client.channels.cache.get('2')
const sentMessage: D.Message = await user.send(channel, '!ping')
const response: D.Message = await DM.awaitMessage(client, channel)
expect(response.content).toBe('Pong!')
```
