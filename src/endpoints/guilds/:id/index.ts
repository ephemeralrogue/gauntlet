import templates from './templates'
import type {Snowflake} from 'discord-api-types/v8'
import type {EmitPacket, HasIntents} from '../../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../../types'
import type {GuildsIdTemplates} from './templates'

export type GuildsFn = (
  id: Snowflake
) => {
  /* channels: {
    post: (options: {
      data: RESTPostAPIGuildChannelJSONBody
      reason?: string
    }) => Promise<RESTPostAPIGuildChannelResult>
  }
  emojis: {
    post: (options: {
      data: RESTPostAPIGuildEmojiJSONBody
      reason?: string
    }) => Promise<RESTPostAPIGuildEmojiResult>
  }
  preview: {
    get: () => Promise<RESTGetAPIGuildPreviewResult>
  } */
  templates: GuildsIdTemplates
}

export default (
  data: ResolvedData,
  clientData: ResolvedClientData,
  _hasIntents: HasIntents,
  _emitPacket: EmitPacket
): GuildsFn => id => ({templates: templates(data, clientData)(id)})
