import post from './post'
import type {
  // RESTGetAPIGuildPreviewResult,
  // RESTPostAPIGuildChannelJSONBody,
  // RESTPostAPIGuildChannelResult,
  // RESTPostAPIGuildEmojiJSONBody,
  // RESTPostAPIGuildEmojiResult,
  RESTPostAPIGuildsJSONBody,
  RESTPostAPIGuildsResult
} from 'discord-api-types/v8'
import type {EmitPacket} from '../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../Data'

export interface Guilds {
  // TODO: make endpoints a proxy https://github.com/discordjs/discord.js/pull/5256
  // channels: {
  //   post: (options: {
  //     data: RESTPostAPIGuildChannelJSONBody
  //     reason?: string
  //   }) => Promise<RESTPostAPIGuildChannelResult>
  // }
  // emojis: {
  //   post: (options: {
  //     data: RESTPostAPIGuildEmojiJSONBody
  //     reason?: string
  //   }) => Promise<RESTPostAPIGuildEmojiResult>
  // }
  // preview: {
  //   get: () => Promise<RESTGetAPIGuildPreviewResult>
  // }
  post: (options: {
    data: RESTPostAPIGuildsJSONBody
  }) => Promise<RESTPostAPIGuildsResult>
}

export const guilds = (
  data: ResolvedData,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
): Guilds => ({
  post: post(data, clientData, emitPacket)
})
