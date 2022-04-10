import Discord from 'discord.js'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {Message} from '../Message'
import type {MessageReaction} from '../MessageReaction'
import type {User} from '../User'
import type {_Collector, CollectorEnd} from './Collector'

export type ReactionCollectorFilter = (
  reaction: MessageReaction, user: User, collected?: Collection<Snowflake, MessageReaction>
) => boolean

type ReactionListener = Parameters<(reaction: MessageReaction, user: User) => void>

interface ReactionCollectorCtor {
  new(): ReactionCollector
  key(reaction: MessageReaction): Snowflake | string
}

interface ReactionCollectorEvents {
  collect: ReactionListener
  dispose: ReactionListener
  remove: ReactionListener
  end: CollectorEnd<MessageReaction>
}

export interface ReactionCollector extends Discord.ReactionCollector, _Collector {
  /*
   * client is declared here instead of extending Collector because TS gives an error about client not being the same in
   * Discord.ReactionCollector and in Collector (even though it works in MessageCollector)
   */
  readonly client: Client
  collected: Collection<Snowflake, MessageReaction>
  readonly next: Promise<MessageReaction>

  message: Message
  filter: ReactionCollectorFilter
  users: Collection<Snowflake, User>

  [Symbol.asyncIterator](): AsyncIterableIterator<MessageReaction>

  on<K extends keyof ReactionCollectorEvents>(event: K, listener: (...args: ReactionCollectorEvents[K]) => void): this
  once<K extends keyof ReactionCollectorEvents>(event: K, listener: (...args: ReactionCollectorEvents[K]) => void): this
  once<K extends keyof ReactionCollectorEvents>(event: K, ...args: ReactionCollectorEvents[K]): this
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- Reaction Collector is a class
export const ReactionCollector = Discord.ReactionCollector as unknown as ReactionCollectorCtor
