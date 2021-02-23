import * as D from 'discord.js'
import * as DM from '../src'
import type {MatchObjectGuild} from './utils'
import './matchers'

describe('mockClient', () => {
  test('ready event is emitted', async () => {
    const client = new D.Client({intents: []})
    const promise = new Promise<void>(resolve => {
      client.on('ready', resolve)
    })
    DM.mockClient(client)
    await expect(promise).toResolve()
  })

  describe('guild create event', () => {
    const appID = '0'
    const userID = '1'
    const id1 = '2'
    const id2 = '3'
    const backend = new DM.Backend({
      applications: [{id: appID, bot: {id: userID}}],
      guilds: [
        {id: id1, members: [{id: userID}]},
        {id: id2, members: [{id: userID}]},
        {id: '4'}
      ]
    })
    const clientData: DM.ClientData = {application: {id: appID}}

    test('are emitted with GUILDS intent', async () => {
      const client = new D.Client({intents: ['GUILDS']})
      const emittedGuilds = new Promise<ReadonlySet<D.Guild>>(resolve => {
        const guilds = new Set<D.Guild>()
        client.on('guildCreate', guild => {
          guilds.add(guild)
          if (guilds.size === 2) resolve(guilds)
        })
      })
      DM.mockClient(client, clientData, backend)
      expect(await emittedGuilds).toEqual(
        new Set([
          expect.objectContaining<MatchObjectGuild>({id: id1}),
          expect.objectContaining<MatchObjectGuild>({id: id2})
        ])
      )
    })

    test('not emitted without GUILDS intent', async () => {
      const client = new D.Client({intents: []})
      const promise = new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 500)
        client.on('guildCreate', ({id}) => {
          reject(new Error(`guild create event fired with guild with ID ${id}`))
        })
      })
      DM.mockClient(client, clientData, backend)
      await expect(promise).toResolve()
    })
  })
})
