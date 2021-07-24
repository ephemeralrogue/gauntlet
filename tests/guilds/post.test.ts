/* eslint jest/expect-expect: [2, {assertFunctionNames: ['expect', '_formErr', 'formErr']}]
  -- The helper functions _formErr and formErr use expect
*/

import {RESTJSONErrorCodes} from 'discord-api-types/v9'
import * as D from 'discord.js'
import type {ChannelTypes} from 'discord.js/typings/enums'
import * as DM from '../../src'
import type {Override} from '../../src/utils'
import '../matchers'
import type {MatchObjectGuild} from '../utils'
import {withClient, withClientF} from '../utils'

// TODO: fix Discord.js types
type GuildCreateOpts = Override<
  D.GuildCreateOptions,
  {
    channels?: Override<
      D.PartialChannelData,
      {type?: keyof typeof ChannelTypes}
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

  test(
    'only name supplied',
    withClientF(async client => {
      expect(await client.guilds.create(name)).toMatchObject<MatchObjectGuild>({
        name,
        afkTimeout: 300,
        defaultMessageNotifications: 'ALL_MESSAGES',
        explicitContentFilter: 'DISABLED',
        verificationLevel: 'NONE'
      })
    })
  )

  test(
    'overriding basic defaults',
    withClientF(async client => {
      const afkTimeout = 60
      const defaultMessageNotifications: D.DefaultMessageNotificationLevel =
        'ONLY_MENTIONS'
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
  )

  describe('channels', () => {
    test(
      'parent channel',
      withClientF(async client => {
        const parentId = 0
        const {
          channels: {cache: channels}
        } = await client.guilds.create(name, {
          channels: [
            {
              name,
              id: parentId,
              type: 'GUILD_CATEGORY'
            },
            {name, parentId}
          ]
        })
        expect(channels.find(({type}) => type === 'GUILD_TEXT')!.parentId).toBe(
          channels.find(({type}) => type === 'GUILD_CATEGORY')!.id
        )
      })
    )

    test(
      // eslint-disable-next-line jest/lowercase-name -- acronym
      'AFK channel',
      withClientF(async client => {
        const id = 0
        const guild = await client.guilds.create(name, {
          channels: [{name, id, type: 'GUILD_VOICE'}],
          afkChannelId: id
        })
        expect(guild.afkChannelId).toBe(guild.channels.cache.first()!.id)
      })
    )

    test(
      'system channel',
      withClientF(async client => {
        const id = 0
        const guild = await client.guilds.create(name, {
          channels: [{name, id}],
          systemChannelId: id
        })
        expect(guild.systemChannelId).toBe(guild.channels.cache.first()!.id)
      })
    )

    test(
      'channel overrides',
      withClientF(async client => {
        const id = 0
        const deny: D.PermissionString = 'VIEW_CHANNEL'
        const guild = await client.guilds.create(name, {
          roles: [{}, {id}],
          channels: [{name, permissionOverwrites: [{id, deny}]}]
        })
        const channel = guild.channels.cache.first()!
        expect(channel).toBeInstanceOf(D.TextChannel)
        expect(
          (channel as D.TextChannel).permissionOverwrites.cache.get(
            guild.roles.cache.findKey(role => role.id !== guild.id)!
          )?.deny
        ).toEqualBitfield(deny)
      })
    )
  })
})

describe('errors', () => {
  test('too many guilds', async () => {
    await withClient(
      async client =>
        expect(client.guilds.create('name')).toThrowAPIError(
          RESTJSONErrorCodes.MaximumNumberOfGuildsReached
        ),
      Array.from({length: 10}).reduce(DM.guildWithClient(), {})
    )
  })

  // Discord.js sometimes mutates the input, so we need to have a unique input
  // every time otherwise TypeErrors may occur
  // This is why a function is sometimes used to provide the options
  const _formErr = (
    ...args: Parameters<D.GuildManager['create']>
  ): (() => Promise<void>) =>
    withClientF(async client =>
      expect(client.guilds.create(...args)).toThrowAPIFormError()
    )

  test('too short name', _formErr(''))
  test('too long name', _formErr('a'.repeat(101)))

  const name = 'name'
  const formErr = (options?: GuildCreateOpts): (() => Promise<void>) =>
    _formErr(name, options)

  describe('channels', () => {
    test('no channel name', formErr({channels: [{name: ''}]}))

    test(
      'too long channel name',
      formErr({channels: [{name: 'a'.repeat(101)}]})
    )

    test('invalid channel type', formErr({channels: [{name, type: 'DM'}]}))

    const parentId = 0

    describe('parent channel', () => {
      test('missing', formErr({channels: [{name, parentId}]}))

      describe('invalid type', () => {
        test(
          'using default text type',
          formErr({
            channels: [
              {name, id: parentId},
              {name, parentId}
            ]
          })
        )

        test(
          'using explicit incorrect type',
          formErr({
            channels: [
              {name, id: parentId, type: 'GUILD_TEXT'},
              {name, parentId}
            ]
          })
        )
      })

      test(
        'parent not before child',
        formErr({
          channels: [
            {name, parentId},
            {name, id: parentId, type: 'GUILD_CATEGORY'}
          ]
        })
      )
    })

    describe.each([
      // as boolean is required to get correct type
      ['AFK channel', 'afkChannelId', 'GUILD_TEXT', true as boolean],
      ['system channel', 'systemChannelId', 'GUILD_VOICE']
    ] as const)('%s', (_, key, type, checkDefault = false) => {
      const id = 0
      test('missing', formErr({channels: [{name}], [key]: id}))
      if (checkDefault) {
        test(
          'invalid default type',
          formErr({channels: [{name, id}], [key]: id})
        )
      }
      test('invalid type', formErr({channels: [{name, id, type}], [key]: id}))
    })
  })

  test('invalid AFK timeout', formErr({afkTimeout: 1234}))
})
