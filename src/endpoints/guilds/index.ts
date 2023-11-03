import guildsId from './_id/index.ts';
import templates from './templates.ts';
import post from './post.ts';
import type {
  Backend,
  EmitPacket,
  HasIntents
} from '../../Backend.ts';
import type { Snowflake } from '../../types/index.ts';
import type { GuildsFn } from './_id/index.ts';
import type { GuildsTemplates } from './templates.ts';
import type { GuildsPost } from './post.ts';

export interface Guilds extends GuildsFn {
  templates: GuildsTemplates
  post: GuildsPost
}

export const guilds = (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): Guilds =>
  Object.assign(guildsId(backend, applicationId), {
    templates: templates(backend, applicationId, hasIntents, emitPacket),
    post: post(backend, applicationId, hasIntents, emitPacket)
  })
