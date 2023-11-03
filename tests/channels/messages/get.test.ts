import {
  ChannelType,
  PermissionFlagsBits,
  RESTJSONErrorCodes
} from 'discord-api-types/v9';
import {
  guildWithBot,
  withClient,
  withClientF
} from '../../utils.ts';
import { getChannel } from './utils.ts';
import type * as DM from '../../../src'
import '../../matchers'

const messageId = '0'
const channels: DM.CollectionResolvableId<DM.GuildChannel> = [
  {
    type: ChannelType.GuildText,
    messages: [{ id: messageId }]
  }
]

describe('successes', () => {
  test(
    'basic',
    withClientF(
      async client =>
        expect((await getChannel(client).messages.fetch(messageId)).id).toBe(
          messageId
        ),
      guildWithBot({ channels })
    )
  )
})

describe('errors', () => {
  test('no READ_MESSAGE_HISTORY', async () => {
    const guildId = '1'
    await withClient(
      async client =>
        expect(getChannel(client).messages.fetch(messageId)).toThrowAPIError(
          RESTJSONErrorCodes.MissingAccess
        ),
      guildWithBot({
        id: guildId,
        channels,
        roles: [{ id: guildId, permissions: PermissionFlagsBits.ViewChannel }]
      })
    )
  })
})
