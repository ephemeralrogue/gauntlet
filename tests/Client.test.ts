import {Constants, DiscordAPIError} from 'discord.js'
import {Client, Discord} from '../src'
import type {ValueOf} from '../src/utils'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {APIErrors} = Constants

const expectInstanceOf: <T extends new (...args: any[]) => any>(
  actual: any,
  expected: T
) => asserts actual is InstanceType<T> = (actual, expected) =>
  expect(actual).toBeInstanceOf(expected)

const expectAPIError = (code: ValueOf<typeof APIErrors>) => (
  error: any
): void => {
  expectInstanceOf(error, DiscordAPIError)
  expect(error.code).toBe(code)
}

describe('Client', () => {
  describe('fetchInvite', () => {
    test('gets invite', async () => {
      const client = new Client({
        invites: {
          abc: {
            channel: {
              id: 'channel id',
              type: Discord.ChannelType.GROUP_DM,
              name: null
            }
          }
        }
      })
      const invite = await client.fetchInvite('abc')
      expect(invite.code).toBe('abc')
      expect(invite.channel.id).toBe('channel id')
      expect(invite.channel.type).toBe('group')
      expect(invite.channel.name).toBe(null)
    })

    test('guild invite', async () => {
      const client = new Client({
        invites: {
          abc: {
            guild: {
              id: 'guild id'
            }
          }
        }
      })
      const invite = await client.fetchInvite('abc')
      expect(invite.code).toBe('abc')
      expect(invite.guild?.id).toBe('guild id')
      expect(invite.channel.type).toBe('text')
      expect(
        (invite.channel as Partial<
          Pick<Extract<typeof invite.channel, {guild: unknown}>, 'guild'>
        > &
          typeof invite.channel).guild?.id
      ).toBe('guild id')
    })

    test('throws on unknown invite', async () => {
      expect.assertions(2)
      await new Client()
        .fetchInvite('abc')
        .catch(expectAPIError(APIErrors.UNKNOWN_INVITE))
    })
  })
})
