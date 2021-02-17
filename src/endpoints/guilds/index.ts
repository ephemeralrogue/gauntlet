import guildsID from './:id'
import templates from './templates'
import post from './post'
import type {EmitPacket} from '../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../Data'
import type {GuildsFn} from './:id'
import type {GuildsTemplates} from './templates'
import type {GuildsPost} from './post'

// TODO: make endpoints a proxy https://github.com/discordjs/discord.js/pull/5256

export interface Guilds extends GuildsFn {
  templates: GuildsTemplates
  post: GuildsPost
}

export const guilds = (
  data: ResolvedData,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
): Guilds =>
  Object.assign(guildsID(data, clientData, emitPacket), {
    templates: templates(data, clientData, emitPacket),
    post: post(data, clientData, emitPacket)
  })
