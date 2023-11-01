import assert from 'assert'
import type * as Discord from 'discord.js'

export const getChannel = (client: Discord.Client): Discord.GuildTextBasedChannel => {
  const guild = client.guilds.cache.first()
  assert(
    guild,
    'There are no cached guilds. Perhaps you forgot to include backend?'
  )
  const channel = guild.channels.cache.find(
    (chan): chan is Discord.GuildTextBasedChannel => chan.isText()
  )
  assert(channel, 'There are no text channels!')
  return channel
}

export const send = async (
  client: Discord.Client,
  options: Discord.MessageOptions | Discord.MessagePayload | string
): Promise<Discord.Message> => getChannel(client).send(options)
