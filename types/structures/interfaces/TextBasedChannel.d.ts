import type {
  APIMessage,
  AwaitMessagesOptions,
  Collection,
  CollectorFilter,
  Constructable,
  Message,
  MessageAdditions,
  MessageCollector,
  MessageCollectorOptions,
  MessageManager,
  MessageOptions,
  Snowflake,
  SplitOptions,
  StringResolvable,
  TextBasedChannelFields,
  TypingData
} from 'discord.js'

declare namespace TextBasedChannel {
  interface MessageOptionsWithoutSplit extends MessageOptions {
    split?: false
  }
  interface MessageOptionsWithSplit extends MessageOptions {
    split: true | SplitOptions
  }
}

declare class TextBasedChannel implements TextBasedChannelFields {
  // PartialTextBasedChannelFields fields
  lastMessageID: Snowflake | null
  get lastMessage(): Message | null

  // TextBasedChannelFields fields
  lastPinTimestamp: number | null
  get lastPinAt(): Date
  get typing(): boolean
  get typingCount(): number
  _typing: Map<string, TypingData>

  messages: MessageManager

  static applyToClass(
    // eslint-disable-next-line @typescript-eslint/ban-types -- see applyToClass in src/util/index.ts
    structure: Constructable<{}>,
    full?: boolean,
    ignore?: string[]
  ): void

  // PartialTextBasedChannelFields methods
  send(
    options:
      | TextBasedChannel.MessageOptionsWithoutSplit
      | MessageAdditions
      | APIMessage
  ): Promise<Message>
  send(
    options:
      | (TextBasedChannel.MessageOptionsWithSplit & {content: StringResolvable})
      | APIMessage
  ): Promise<Message[]>
  send(
    options: (MessageOptions & {content: StringResolvable}) | APIMessage
  ): Promise<Message | Message[]>
  send(
    content: StringResolvable,
    options?: TextBasedChannel.MessageOptionsWithoutSplit | MessageAdditions
  ): Promise<Message>
  send(
    content: StringResolvable,
    options?: TextBasedChannel.MessageOptionsWithSplit
  ): Promise<Message[]>
  send(
    content: StringResolvable,
    options?: MessageOptions
  ): Promise<Message | Message[]>

  // TextBasedChannelFields fields
  awaitMessages(
    filter: CollectorFilter,
    options?: AwaitMessagesOptions
  ): Promise<Collection<Snowflake, Message>>
  bulkDelete(
    messages: Collection<Snowflake, Message> | Message[] | Snowflake[] | number,
    filterOld?: boolean
  ): Promise<Collection<Snowflake, Message>>
  createMessageCollector(
    filter: CollectorFilter,
    options?: MessageCollectorOptions
  ): MessageCollector
  startTyping(count?: number): Promise<void>
  stopTyping(force?: boolean): void
}

export = TextBasedChannel
