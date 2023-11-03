import messages from './_id/messages/index.ts';
import type { Messages } from './_id/messages/index.ts';
import type {
  Backend,
  EmitPacket,
  HasIntents
} from '../../Backend.ts';
import type { Snowflake } from '../../types/index.ts';

export type Channels = Record<Snowflake, { messages: Messages }>

export const channels = (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): Channels =>
  new Proxy(
    {},
    {
      get: (_, id: Snowflake) => ({
        messages: messages(backend, applicationId, hasIntents, emitPacket)(id)
      })
    }
  )
