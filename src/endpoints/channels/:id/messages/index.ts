import patch from './patch'
import post from './post'
import type {Backend, EmitPacket, HasIntents} from '../../../../Backend'
import type {Snowflake} from '../../../../types'
import type {MessagesPatch} from './patch'
import type {MessagesPost} from './post'

export interface Messages {
  patch: MessagesPatch
  post: MessagesPost
}

export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (id: Snowflake): Messages => ({
    patch: patch(backend, applicationId, hasIntents, emitPacket)(id),
    post: post(backend, applicationId, hasIntents, emitPacket)(id)
  })
