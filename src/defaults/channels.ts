import type {Snowflake} from 'discord.js'
import defaults from './defaults'
import type {CategoryChannel, TextChannel, VoiceChannel} from '../discord'

const defaultChannels = (
  guildID: Snowflake
): [CategoryChannel, CategoryChannel, TextChannel, VoiceChannel] => {
  const textChannels = defaults.categoryChannel({
    name: 'Text Channels',
    guild_id: guildID,
    permission_overwrites: []
  })
  const voiceChannels = defaults.categoryChannel({
    name: 'Voice Channels',
    guild_id: guildID,
    permission_overwrites: []
  })
  return [
    textChannels,
    voiceChannels,
    // Default name is general
    defaults.textChannel({
      guild_id: guildID,
      parent_id: textChannels.id,
      permission_overwrites: [],
      rate_limit_per_user: 0
    }),
    defaults.voiceChannel({
      name: 'General',
      guild_id: guildID,
      parent_id: voiceChannels.id,
      permission_overwrites: [],
      bitrate: 64000,
      user_limit: 0
    })
  ]
}
export default defaultChannels
