import templates from './templates'
import post from './post'
import type {
  // RESTDeleteAPIGuildTemplateResult,
  // RESTGetAPIGuildTemplatesResult,
  RESTGetAPITemplateResult,
  // RESTPatchAPIGuildTemplateJSONBody,
  // RESTPatchAPIGuildTemplateResult,
  RESTPostAPIGuildsJSONBody,
  RESTPostAPIGuildsResult,
  // RESTPostAPIGuildTemplatesJSONBody,
  // RESTPostAPIGuildTemplatesResult,
  RESTPostAPITemplateCreateGuildJSONBody,
  RESTPostAPITemplateCreateGuildResult
  // RESTPutAPIGuildTemplateSyncResult,
  // Snowflake
} from 'discord-api-types/v8'
import type {EmitPacket} from '../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../Data'

export interface Guilds {
  // TODO: make endpoints a proxy https://github.com/discordjs/discord.js/pull/5256
  templates: (
    code: string
  ) => {
    get: () => Promise<RESTGetAPITemplateResult>
    post: (options: {
      data: RESTPostAPITemplateCreateGuildJSONBody
    }) => Promise<RESTPostAPITemplateCreateGuildResult>
  }
  post: (options: {
    data: RESTPostAPIGuildsJSONBody
  }) => Promise<RESTPostAPIGuildsResult>
  /* (id: Snowflake): {
    channels: {
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
    }
    templates: {
      get: () => Promise<RESTGetAPIGuildTemplatesResult>
      post: (options: {
        data: RESTPostAPIGuildTemplatesJSONBody
      }) => RESTPostAPIGuildTemplatesResult
      (code: string): {
        delete: () => Promise<RESTDeleteAPIGuildTemplateResult>
        patch: (options: {
          data: RESTPatchAPIGuildTemplateJSONBody
        }) => Promise<RESTPatchAPIGuildTemplateResult>
        put: () => Promise<RESTPutAPIGuildTemplateSyncResult>
      }
    }
  } */
}

export const guilds = (
  data: ResolvedData,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
): Guilds => ({
  templates: templates(data, clientData, emitPacket),
  post: post(data, clientData, emitPacket)
})
