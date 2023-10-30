import assert from 'assert'
import type * as D from 'discord.js'

export const getChannel = (client: D.Client): D.GuildTextBasedChannel => {
  const guild = client.guilds.cache.first()
  assert(
    guild,
    'There are no cached guilds. Perhaps you forgot to include backend?'
  )
  const channel = guild.channels.cache.find(
    (chan): chan is D.GuildTextBasedChannel => chan.isText()
  )
  assert(channel, 'There are no text channels!')
  return channel
}

export const send = async (
  client: D.Client,
  options: D.MessageOptions | D.MessagePayload | string
): Promise<D.Message> => getChannel(client).send(options)
