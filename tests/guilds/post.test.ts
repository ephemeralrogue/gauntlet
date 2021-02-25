/* eslint jest/expect-expect: [2, {assertFunctionNames: ['expect', '_formErr', 'formErr']}]
  -- The helper functions _formErr and formErr use expect
*/

import {RESTJSONErrorCodes} from 'discord-api-types/v8'
import * as DM from '../../src'
import {_withClient, withClient} from '../utils'
import type * as D from 'discord.js'
import type {Override} from '../../src/utils'
import type {MatchObjectGuild} from '../utils'
import '../matchers'

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

  test(
    'only name supplied',
    withClient(async client => {
      expect(await client.guilds.create(name)).toMatchObject<MatchObjectGuild>({
        name,
        afkTimeout: 300,
        defaultMessageNotifications: 'ALL',
        explicitContentFilter: 'DISABLED',
        verificationLevel: 'NONE'
      })
    })
  )

  test(
    'overriding basic defaults',
    withClient(async client => {
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
  )

  describe('channels', () => {
    test(
      'parent channel',
      withClient(async client => {
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
    )

    test(
      // eslint-disable-next-line jest/lowercase-name -- acronym
      'AFK channel',
      withClient(async client => {
        const id = 0
        const guild = await client.guilds.create(name, {
          channels: [{name, id, type: 'voice'}],
          afkChannelID: id
        })
        expect(guild.afkChannelID).toBe(guild.channels.cache.first()!.id)
      })
    )

    test(
      'system channel',
      withClient(async client => {
        const id = 0
        const guild = await client.guilds.create(name, {
          channels: [{name, id}],
          systemChannelID: id
        })
        expect(guild.systemChannelID).toBe(guild.channels.cache.first()!.id)
      })
    )

    test(
      'channel overrides',
      withClient(async client => {
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
            )?.deny
        ).toEqualBitfield(deny)
      })
    )
  })
})

describe('errors', () => {
  test('too many guilds', async () => {
    await _withClient(
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
    withClient(async client =>
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

    test('invalid channel type', formErr({channels: [{name, type: 'dm'}]}))

    const parentID = 0

    describe('parent channel', () => {
      test('missing', formErr({channels: [{name, parentID}]}))

      describe('invalid type', () => {
        test(
          'using default text type',
          formErr({
            channels: [
              {name, id: parentID},
              {name, parentID}
            ]
          })
        )

        test(
          'using explicit incorrect type',
          formErr({
            channels: [
              {name, id: parentID, type: 'text'},
              {name, parentID}
            ]
          })
        )
      })

      test(
        'parent not before child',
        formErr({
          channels: [
            {name, parentID},
            {name, id: parentID, type: 'category'}
          ]
        })
      )
    })

    describe.each([
      // as boolean is required to get correct type
      ['AFK channel', 'afkChannelID', 'text', true as boolean],
      ['system channel', 'systemChannelID', 'voice']
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
