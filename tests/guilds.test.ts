import * as D from 'discord.js'
import * as DM from '../src'

describe('initial guilds', () => {
  test('basic guild', async () => {
    const guildId = '1'
    const appId = '2'
    const userId = '3'
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', async guild => {
        expect(guild.id).toBe(guildId)
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get(userId)).toBeDefined()
        expect(guild.ownerId).toBe(userId)
        expect((await guild.fetchOwner()).id).toBe(userId)
        resolve()
      })
    })
    DM.mockClient(
      client,
      {application: {id: appId}},
      new DM.Backend({
        applications: [{id: appId, bot: {id: userId}}],
        users: [{id: userId}],
        guilds: [{id: guildId, members: [{id: userId}]}]
      })
    )
    await promise
  })

  test('guild member without user in data', async () => {
    const guildId = '1'
    const appId = '2'
    const userId = '3'
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', async guild => {
        expect(guild.id).toBe(guildId)
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get(userId)).toBeDefined()
        expect(guild.ownerId).toBe(userId)
        expect((await guild.fetchOwner()).id).toBe(userId)
        resolve()
      })
    })
    DM.mockClient(
      client,
      {application: {id: appId}},
      new DM.Backend({
        applications: [{id: appId, bot: {id: userId}}],
        guilds: [{id: guildId, members: [{id: userId}]}]
      })
    )
    await promise
  })
})
