import * as D from 'discord.js'
import * as DM from '../src'

describe('initial guilds', () => {
  test('basic guild', () => {
    expect.assertions(5)
    const client = new D.Client()
    client.on('guildCreate', guild => {
      expect(guild.id).toBe('1')
      expect(guild.members.cache.size).toBe(1)
      expect(guild.members.cache.get('2')).toBeDefined()
      expect(guild.ownerID).toBe('2')
      expect(guild.owner?.id).toBe('2')
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({users: {2: {}}, guilds: {1: {members: [{id: '2'}]}}})
    )
  })

  test('guild member without user in data', () => {
    expect.assertions(5)
    const client = new D.Client()
    client.on('guildCreate', guild => {
      expect(guild.id).toBe('1')
      expect(guild.members.cache.size).toBe(1)
      expect(guild.members.cache.get('2')).toBeDefined()
      expect(guild.ownerID).toBe('2')
      expect(guild.owner?.id).toBe('2')
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({guilds: {1: {members: [{id: '2'}]}}})
    )
  })
})
