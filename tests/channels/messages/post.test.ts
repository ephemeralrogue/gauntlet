import {ChannelType, RESTJSONErrorCodes} from 'discord-api-types/v8'
import * as DM from '../../../src'
import {withClient} from '../../utils'
import type * as D from 'discord.js'

describe('successes', () => {
  test('basic content', async () => {
    const content = 'Hello, world!'
    await withClient(
      // TODO: improve discord.js Collection types for predicates in find
      async client =>
        expect(
          (
            await (client.guilds.cache
              .first()!
              .channels.cache.first()! as D.TextChannel).send(content)
          ).content
        ).toBe(content),
      DM.guildWithClient({channels: [{type: ChannelType.GUILD_TEXT}]})()
    )
  })
})
