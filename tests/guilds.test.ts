import * as D from 'discord.js'
import * as DM from '../src'
import {testWithClient} from './utils'
import type {DeepPartialOmit} from './utils'

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

describe('create guild', () => {
  // Omitting valueOf because ({...}).valueOf() is Object, whereas
  // (guild as D.Guild).valueOf() is string
  type MatchObjectGuild = DeepPartialOmit<D.Guild, 'valueOf'>

  testWithClient('only name supplied', async client => {
    const name = 'name'
    const guild = await client.guilds.create(name)
    expect(guild).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout: 300,
      defaultMessageNotifications: 'ALL',
      explicitContentFilter: 'DISABLED',
      verificationLevel: 'NONE'
    })
  })

  testWithClient('overriding basic defaults', async client => {
    const name = 'name'
    const afkTimeout = 60
    const defaultMessageNotifications: D.DefaultMessageNotifications =
      'MENTIONS'
    const explicitContentFilter: D.ExplicitContentFilterLevel = 'ALL_MEMBERS'
    const verificationLevel: D.VerificationLevel = 'HIGH'
    const guild = await client.guilds.create(name, {
      afkTimeout,
      defaultMessageNotifications,
      explicitContentFilter,
      verificationLevel
    })
    expect(guild).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout,
      defaultMessageNotifications,
      explicitContentFilter,
      verificationLevel
    })
  })
})
