import templates from './templates.ts';
import type { Backend } from '../../../Backend.ts';
import type { Snowflake } from '../../../types/index.ts';
import type { GuildsIdTemplates } from './templates.ts';

export type GuildsFn = (id: Snowflake) => {
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

export default (backend: Backend, applicationId: Snowflake): GuildsFn =>
  id => ({ templates: templates(backend, applicationId)(id) })
