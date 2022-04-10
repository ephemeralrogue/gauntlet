import Discord from 'discord.js'
import type {Stream} from 'stream'
import type {
  DMChannel, GuildMember, Message, MessageAdditions, MessageMentionOptions, MessageOptions, NewsChannel,
  StringResolvable, TextChannel, User, Webhook, WebhookClient, WebhookMessageOptions
} from 'discord.js'
import type * as Data from '../data'

// Message#edit uses an APIMessage with itself as the target and Discord.js doesn't include Message as a MessageTarget
export type MessageTarget = TextChannel | NewsChannel | DMChannel | User | GuildMember | Webhook | WebhookClient | Message

interface APIMessage extends Discord.APIMessage {
  // target: MessageTarget
  data: {
    content: string | undefined
    tts: boolean
    nonce: number | undefined
    embed: Data.SendMessageEmbed | null
    embeds: Data.SendMessageEmbed[]
    username: string | undefined
    avatar_url: string | undefined
    allowed_mentions: MessageMentionOptions | undefined
    flags: Data.MessageFlags
  } | null

  files: {
    attachment: string | Buffer | Stream
    name: string
    file: Buffer
  }[] | null

  split(): APIMessage[]
}

type DiscordAPIMessageCtor = typeof Discord.APIMessage
interface APIMessageCtor extends DiscordAPIMessageCtor {
  new (target: MessageTarget, options: MessageOptions | WebhookMessageOptions): APIMessage
  create(
    target: MessageTarget,
    content?: StringResolvable,
    options?: MessageOptions | WebhookMessageOptions | MessageAdditions,
    extra?: MessageOptions | WebhookMessageOptions
  ): APIMessage
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- APIMessage is a class
const APIMessage = Discord.APIMessage as APIMessageCtor
export default APIMessage
