import patch from './:id/patch'
import post from './post'
import type {Backend, EmitPacket, HasIntents} from '../../../../Backend'
import type {Snowflake} from '../../../../types'
import type {MessagesPatch} from './:id/patch'
import type {MessagesPost} from './post'

export interface Messages extends Record<`${bigint}`, {patch: MessagesPatch}> {
  post: MessagesPost
}

export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (channelId: Snowflake): Messages =>
    new Proxy(
      {},
      {
        get: (_, key: string) =>
          key === 'post'
            ? post(backend, applicationId, hasIntents, emitPacket)(channelId)
            : {
                patch: patch(
                  backend,
                  applicationId,
                  hasIntents,
                  emitPacket
                )(channelId, key)
              }
      }
    ) as Messages
