import post from './post.ts';
import get from './_id/get.ts';
import patch from './_id/patch.ts';
import type {
  Backend,
  EmitPacket,
  HasIntents
} from '../../../../Backend.ts';
import type { Snowflake } from '../../../../types/index.ts';
import type { MessagesGet } from './_id/get.ts'
import type { MessagesPatch } from './_id/patch.ts'
import type { MessagesPost } from './post.ts'

export interface Messages
  extends Record<`${bigint}`, { get: MessagesGet; patch: MessagesPatch }> {
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
              get: get(backend, applicationId)(channelId, key),
              patch: patch(
                backend,
                applicationId,
                hasIntents,
                emitPacket
              )(channelId, key)
            }
      }
    ) as Messages
