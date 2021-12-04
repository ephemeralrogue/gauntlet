import {ChannelType} from 'discord-api-types/v9'
import * as D from 'discord.js'
import {guildWithBot, withClient} from '../../utils'
import {send} from './utils'
import type * as DM from '../../../src'
import type {WithClientOptions} from '../../utils'
import '../../matchers'

const channels: DM.CollectionResolvableId<DM.GuildChannel> = [
  {type: ChannelType.GuildText}
]

const defaultOpts = (): WithClientOptions => guildWithBot({channels})

describe('successes', () => {
  test(
    'edited timestamp changed',
    withClientF(async client => {
      const message = await send(client, 'foo')
      await message.edit({})
      expect(message.editedTimestamp).toBeGreaterThan(message.createdTimestamp)
    }, defaultOpts())
  )

  test(
    'edit content',
    withClientF(async client => {
      const message = await send(client, 'foo')
      const newContent = 'bar'
      await message.edit(newContent)
      expect(message.content).toBe(newContent)
    }, defaultOpts())
  )

  test(
    'existing properties should be preserved',
    withClientF(async client => {
      const message = await send(client, {
        content: 'foo',
        embeds: [new D.MessageEmbed({title: 'foo'})]
      })
      const oldEmbeds = message.embeds
      const newContent = 'bar'
      await message.edit(newContent)
      expect(message.content).toBe(newContent)
      expect(message.embeds).toStrictEqual(oldEmbeds)
    }, defaultOpts())
  )
})

describe('flags', () => {
  test(
    'set SUPPRESS_EMBEDS',
    withClientF(async client => {
      const message = await send(client, 'foo')
      await message.edit({flags: 'SUPPRESS_EMBEDS'})
      expect(message.flags.has('SUPPRESS_EMBEDS')).toBe(true)
    }, defaultOpts())
  )

  test(
    'unset SUPPRESS_EMBEDS',
    withClientF(async client => {
      const message = await send(client, {content: 'foo'})
      await message.edit({flags: 'SUPPRESS_EMBEDS'})
      await message.edit({flags: 0})
      expect(message.flags.has('SUPPRESS_EMBEDS')).toBe(false)
    }, defaultOpts())
  )

  test.todo('ignore non-SUPPRESS_EMBEDS flags')
})
