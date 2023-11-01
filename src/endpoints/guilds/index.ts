import guildsId from './_id'
import templates from './templates'
import post from './post'
import type {Backend, EmitPacket, HasIntents} from '../../Backend'
import type {Snowflake} from '../../types'
import type {GuildsFn} from './_id'
import type {GuildsTemplates} from './templates'
import type {GuildsPost} from './post'

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
