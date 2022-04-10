import Discord from 'discord.js'
import type {Collection, MessageCollectorOptions, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {DMChannel, NewsChannel, Message, TextChannel} from '..'
import type {_Collector, CollectorEnd} from './Collector'

export type MessageCollectorFilter = (
  message: Message, collected?: Collection<Snowflake, Message>
) => boolean

type MessageCollectorCtor = new (
  channel: TextChannel | NewsChannel | DMChannel, filter: MessageCollectorFilter, options?: MessageCollectorOptions
) => MessageCollector

interface MessageCollectorEvents {
  collect: Parameters<(message: Message) => void>
  // can be a PartialMessage
  dispose: Parameters<(message: Message) => void>
  end: CollectorEnd<Message>
}

export interface MessageCollector extends Discord.MessageCollector, _Collector {
  collected: Collection<Snowflake, Message>
  readonly next: Promise<Message>

  channel: TextChannel | NewsChannel | DMChannel
  readonly client: Client
  filter: MessageCollectorFilter

  [Symbol.asyncIterator](): AsyncIterableIterator<Message>

  collect(message: Message): Snowflake
  dispose(message: Message): Snowflake
  handleCollect(message: Message): void
  handleDispose(message: Message): void

  on<K extends keyof MessageCollectorEvents>(event: K, listener: (...args: MessageCollectorEvents[K]) => void): this
  once<K extends keyof MessageCollectorEvents>(event: K, listener: (...args: MessageCollectorEvents[K]) => void): this
  once<K extends keyof MessageCollectorEvents>(event: K, ...args: MessageCollectorEvents[K]): this
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- MessageCollector is a class
export const MessageCollector = Discord.MessageCollector as unknown as MessageCollectorCtor
