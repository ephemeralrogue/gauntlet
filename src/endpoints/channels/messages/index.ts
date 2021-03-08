import post from './post'
import type {Snowflake} from 'discord-api-types/v8'
import type {EmitPacket, HasIntents} from '../../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../../types'
import type {MessagesPost} from './post'

export interface Messages {
  post: MessagesPost
}

export default (
  data: ResolvedData,
  clientData: ResolvedClientData,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
) => (id: Snowflake): Messages => ({
  post: post(data, clientData, hasIntents, emitPacket)(id)
})
