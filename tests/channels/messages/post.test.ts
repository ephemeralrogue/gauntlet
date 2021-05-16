/* eslint jest/expect-expect: [2, {assertFunctionNames: ['expect', 'expectMentions']}]
  -- The helper fn expectMentions uses expect
*/

import assert from 'assert'
import {ChannelType} from 'discord-api-types/v8'
import * as DM from '../../../src'
import {withClient, withClientF} from '../../utils'
import type {Snowflake} from 'discord-api-types/v8'
import type * as D from 'discord.js'
import type {DeepPartialOmit} from '../../utils'
import '../../matchers'

const betterAssert: (
  value: unknown,
  message?: Error | string
) => asserts value = assert

const guildDataExtra = (
  guild: DM.Data.PartialDeep<DM.Data.Guild>
): DM.Combinator =>
  DM.guildWithClient({
    channels: [{type: ChannelType.GUILD_TEXT}],
    ...guild
  })
const guildDataC = DM.guildWithClient({
  channels: [{type: ChannelType.GUILD_TEXT}]
})
const guildData = guildDataC()

const getChannel = (client: D.Client): D.TextChannel => {
  const guild = client.guilds.cache.first()
  betterAssert(
    guild,
    'There are no cached guilds. Perhaps you forgot to include guildData?'
  )
  return guild.channels.cache.first()! as D.TextChannel
}
type SingleMessageSendArgs =
  | [
      content:
        | D.APIMessageContentResolvable
        | D.MessageAdditions
        | (D.MessageOptions & {split?: false})
    ]
  | [
      content: D.StringResolvable,
      options: D.MessageAdditions | (D.MessageOptions & {split?: false})
    ]
const send = async (
  client: D.Client,
  ...args: SingleMessageSendArgs
): Promise<D.Message> =>
  (
    getChannel(client) as {
      send: (...args_: SingleMessageSendArgs) => Promise<D.Message>
    }
  ).send(...args)

describe('successes', () => {
  test('has same content', async () => {
    const content = 'Hello, world!'
    await withClient(
      // TODO: improve discord.js Collection types for predicates in find
      async client =>
        expect((await send(client, content)).content).toBe(content),
      guildData
    )
  })

  test('has correct author ID', async () => {
    const id = '0'
    await withClient(
      async client => expect((await send(client, 'foo')).author.id).toBe(id),
      guildDataC(DM.botData({bot: {id}})())
    )
  })

  test(
    "channel's messages get updated",
    withClientF(async client => {
      const channel = getChannel(client)
      const message = await channel.send('foo')
      expect(channel.lastMessageID).toBe(message.id)
      expect(channel.lastMessage).toBe(message)
      expect(channel.messages.cache.last()).toBe(message)
    }, guildData)
  )

  test('basic embed', async () => {
    const title = 'title'
    const description = 'description'
    const fields: D.EmbedFieldData[] = [
      {name: 'field 1', value: 'field 1 value'},
      {name: 'field 2', value: 'field 2 value'}
    ]
    await withClient(
      async client =>
        expect(
          (
            await send(client, {embed: {title, description, fields}})
          ).embeds
        ).toMatchObject<DeepPartialOmit<D.MessageEmbed[]>>([
          {title, description, fields}
        ]),
      guildData
    )
  })

  test('basic attachment', async () => {
    const name = 'test.png'
    await withClient(async client => {
      const message = await send(client, {
        files: [{attachment: Buffer.of(), name}]
      })
      expect(message.attachments.size).toBe(1)
      expect(message.attachments.first()!).toMatchObject<
        DeepPartialOmit<D.MessageAttachment>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- asymmetric matcher
      >({name, attachment: expect.stringContaining(message.id)})
    }, guildData)
  })

  // https://discord.com/developers/docs/resources/channel#allowed-mentions-object-allowed-mentions-reference
  describe('allowed mentions', () => {
    const userID1 = '10'
    const userID2 = '11'
    const userID3 = '12'
    const roleID1 = '20'
    const data = guildDataExtra({
      roles: [{id: roleID1}]
    })({data: {users: [{id: userID1}, {id: userID2}]}})

    const expectMentions = (
      content: string,
      allowedMentions: D.MessageMentionOptions | undefined,
      {
        everyone,
        users,
        roles
      }: {
        everyone: boolean
        users: readonly Snowflake[]
        roles: readonly Snowflake[]
      }
    ): (() => Promise<void>) =>
      withClientF(async client => {
        const {mentions} = await send(client, content, {allowedMentions})
        expect(mentions.everyone).toBe(everyone)
        expect(new Set(mentions.users.keyArray())).toStrictEqual(new Set(users))
        expect(new Set(mentions.roles.keyArray())).toStrictEqual(new Set(roles))
      }, data)

    test(
      'no allowed_mentions',
      expectMentions(
        `@here Hi there from <@${userID1}>, cc <@&${roleID1}>`,
        undefined,
        {
          everyone: true,
          users: [userID1],
          roles: [roleID1]
        }
      )
    )

    test(
      'all mentions suppressed',
      expectMentions(
        `@everyone hi there, <@${userID1}>`,
        {parse: []},
        {everyone: false, users: [], roles: []}
      )
    )

    test(
      'empty users but with parse: [users]',
      expectMentions(
        `@everyone <@${userID1}> <@&${roleID1}>`,
        {parse: ['users', 'roles'], users: []},
        {everyone: false, users: [userID1], roles: [roleID1]}
      )
    )

    test(
      'only some users and no roles',
      expectMentions(
        `@everyone <@${userID1}> <@${userID2}> <@${userID3}> <@&${roleID1}>`,
        {parse: ['everyone'], users: [userID1, userID2]},
        {everyone: true, users: [userID1, userID2], roles: []}
      )
    )

    test(
      'extra users',
      expectMentions(
        `<@${userID1}> Time for some memes.`,
        {users: [userID1, userID2]},
        {everyone: false, users: [userID1], roles: []}
      )
    )
  })
})

describe('errors', () => {
  describe('form errors', () => {
    test(
      'mutually exclusive allowed_mentions',
      withClientF(
        async client =>
          expect(
            send(client, 'foo', {
              allowedMentions: {parse: ['users'], users: ['0', '1']}
            })
          ).toThrowAPIFormError(),
        guildData
      )
    )
  })
})
