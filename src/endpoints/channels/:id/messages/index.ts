import post from './post'
import type {Backend, EmitPacket, HasIntents} from '../../../../Backend'
import type {Snowflake} from '../../../../types'
import type {MessagesPost} from './post'

export interface Messages {
  post: MessagesPost
}

export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (id: Snowflake): Messages => ({
    post: post(backend, applicationId, hasIntents, emitPacket)(id)
  })
