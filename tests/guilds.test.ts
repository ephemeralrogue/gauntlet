import * as D from 'discord.js'
import * as DM from '../src'
import {_testWithClient} from './utils'

describe('initial guilds', () => {
  test('basic guild', async () => {
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', guild => {
        expect(guild.id).toBe('1')
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get('2')).toBeDefined()
        expect(guild.ownerID).toBe('2')
        expect(guild.owner?.id).toBe('2')
        resolve()
      })
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({users: {2: {}}, guilds: {1: {members: [{id: '2'}]}}})
    )
    await promise
  })

  test('guild member without user in data', async () => {
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', guild => {
        expect(guild.id).toBe('1')
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get('2')).toBeDefined()
        expect(guild.ownerID).toBe('2')
        expect(guild.owner?.id).toBe('2')
        resolve()
      })
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({guilds: {1: {members: [{id: '2'}]}}})
    )
    await promise
  })
})
