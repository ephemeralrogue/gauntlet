import {RESTJSONErrorCodes} from 'discord-api-types/v8'
import {
  _testWithClient,
  expectAPIError,
  expectFormError,
  testWithClient
} from '../utils'
import type * as D from 'discord.js'
import type {Override} from '../../src/utils'
import type {MatchObjectGuild} from '../utils'

// TODO: fix Discord.js types
type GuildCreateOpts = Override<
  D.GuildCreateOptions,
  {
    channels?: Override<
      D.PartialChannelData,
      {type?: keyof typeof ChannelType}
    >[]
  }
>

declare module 'discord.js' {
  interface GuildManager {
    create(name: string, options?: GuildCreateOpts): Promise<Guild>
  }
}

describe('successes', () => {
  const name = 'name'

  testWithClient('only name supplied', async client => {
    expect(await client.guilds.create(name)).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout: 300,
      defaultMessageNotifications: 'ALL',
      explicitContentFilter: 'DISABLED',
      verificationLevel: 'NONE'
    })
  })

  testWithClient('overriding basic defaults', async client => {
    const afkTimeout = 60
    const defaultMessageNotifications: D.DefaultMessageNotifications =
      'MENTIONS'
    const explicitContentFilter: D.ExplicitContentFilterLevel = 'ALL_MEMBERS'
    const verificationLevel: D.VerificationLevel = 'HIGH'
    expect(
      await client.guilds.create(name, {
        afkTimeout,
        defaultMessageNotifications,
        explicitContentFilter,
        verificationLevel
      })
    ).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout,
      defaultMessageNotifications,
      explicitContentFilter,
      verificationLevel
    })
  })

  describe('channels', () => {
    testWithClient('parent channel', async client => {
      const parentID = 0
      const {
        channels: {cache: channels}
      } = await client.guilds.create(name, {
        channels: [
          {name, id: parentID, type: 'category'},
          {name, parentID}
        ]
      })
      expect(channels.find(({type}) => type === 'text')!.parentID).toBe(
        channels.find(({type}) => type === 'category')!.id
      )
    })

    testWithClient('AFK channel', async client => {
      const id = 0
      const guild = await client.guilds.create(name, {
        channels: [{name, id, type: 'voice'}],
        afkChannelID: id
      })
      expect(guild.afkChannelID).toBe(guild.channels.cache.first()!.id)
    })

    testWithClient('system channel', async client => {
      const id = 0
      const guild = await client.guilds.create(name, {
        channels: [{name, id}],
        systemChannelID: id
      })
      expect(guild.systemChannelID).toBe(guild.channels.cache.first()!.id)
    })

    testWithClient('channel overrides', async client => {
      const id = 0
      const deny: D.PermissionString = 'VIEW_CHANNEL'
      const guild = await client.guilds.create(name, {
        roles: [{}, {id}],
        channels: [{name, permissionOverwrites: [{id, deny}]}]
      })
      expect(
        guild.channels.cache
          .first()!
          .permissionOverwrites.get(
            guild.roles.cache.findKey(role => role.id !== guild.id)!
          )
          ?.deny.equals(deny)
      ).toBe(true)
    })
  })
})

describe('errors', () => {
  describe('too many guilds', () => {
    const userID = '1'
    _testWithClient(
      async client =>
        expectAPIError(
          client.guilds.create('name'),
          RESTJSONErrorCodes.MaximumNumberOfGuildsReached
        ),
      {
        data: {
          guilds: Array.from({length: 10}).map(() => ({
            members: [{id: userID}]
          }))
        },
        clientData: {userID}
      }
    )
  })

  type Params = Parameters<D.GuildManager['create']>
  // Discord.js sometimes mutates the input, so we need to have a unique input
  // every time otherwise TypeErrors may occur
  // This is why a function is sometimes used to provide the options
  const _formErr = (...args: Params | [() => Params]) => async (
    client: D.Client
  ): Promise<void> =>
    expectFormError(
      client.guilds.create(
        ...(typeof args[0] == 'function' ? args[0]() : (args as Params))
      )
    )

  testWithClient('too short name', _formErr(''))
  testWithClient('too long name', _formErr('a'.repeat(101)))

  const name = 'name'
  const formErr = (
    options?: GuildCreateOpts | (() => GuildCreateOpts)
  ): ((client: D.Client) => Promise<void>) =>
    _formErr(
      ...(typeof options == 'function'
        ? [(): Params => [name, options()]]
        : ([name, options] as const))
    )

  describe('channels', () => {
    testWithClient('no channel name', formErr({channels: [{name: ''}]}))

    testWithClient(
      'too long channel name',
      formErr({channels: [{name: 'a'.repeat(101)}]})
    )

    testWithClient(
      'invalid channel type',
      formErr(() => ({channels: [{name, type: 'dm'}]}))
    )

    const parentID = 0

    describe('parent channel', () => {
      testWithClient(
        'missing',
        formErr(() => ({channels: [{name, parentID}]}))
      )

      describe('invalid type', () => {
        testWithClient(
          'using default text type',
          formErr(() => ({
            channels: [
              {name, id: parentID},
              {name, parentID}
            ]
          }))
        )

        testWithClient(
          'using explicit incorrect type',
          formErr(() => ({
            channels: [
              {name, id: parentID, type: 'text'},
              {name, parentID}
            ]
          }))
        )
      })

      testWithClient(
        'parent not before child',
        formErr(() => ({
          channels: [
            {name, parentID},
            {name, id: parentID, type: 'category'}
          ]
        }))
      )
    })

    describe.each([
      // as boolean is required to get correct type
      ['AFK channel', 'afkChannelID', 'text', true as boolean],
      ['system channel', 'systemChannelID', 'voice']
    ] as const)('%s', (_, key, type, checkDefault = false) => {
      const id = 0
      testWithClient('missing', formErr({channels: [{name}], [key]: id}))
      if (checkDefault) {
        testWithClient(
          'invalid default type',
          formErr(() => ({channels: [{name, id}], [key]: id}))
        )
      }
      testWithClient(
        'invalid type',
        formErr(() => ({channels: [{name, id, type}], [key]: id}))
      )
    })
  })

  testWithClient('invalid AFK timeout', formErr({afkTimeout: 1234}))
})
