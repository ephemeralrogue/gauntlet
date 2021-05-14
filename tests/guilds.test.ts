import * as D from 'discord.js'
import * as DM from '../src'

describe('initial guilds', () => {
  test('basic guild', async () => {
    const guildID = '1'
    const appID = '2'
    const userID = '3'
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', async guild => {
        expect(guild.id).toBe(guildID)
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get(userID)).toBeDefined()
        expect(guild.ownerID).toBe(userID)
        expect((await guild.fetchOwner()).id).toBe(userID)
        resolve()
      })
    })
    DM.mockClient(
      client,
      {application: {id: appID}},
      new DM.Backend({
        applications: [{id: appID, bot: {id: userID}}],
        users: [{id: userID}],
        guilds: [{id: guildID, members: [{id: userID}]}]
      })
    )
    await promise
  })

  test('guild member without user in data', async () => {
    const guildID = '1'
    const appID = '2'
    const userID = '3'
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', async guild => {
        expect(guild.id).toBe(guildID)
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get(userID)).toBeDefined()
        expect(guild.ownerID).toBe(userID)
        expect((await guild.fetchOwner()).id).toBe(userID)
        resolve()
      })
    })
    DM.mockClient(
      client,
      {application: {id: appID}},
      new DM.Backend({
        applications: [{id: appID, bot: {id: userID}}],
        guilds: [{id: guildID, members: [{id: userID}]}]
      })
    )
    await promise
  })
})
