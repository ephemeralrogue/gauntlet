import md from 'discord-markdown'
import {
  AllowedMentionsTypes,
  GatewayIntentBits,
  PermissionFlagsBits
} from 'discord-api-types/v9'
import * as defaults from '../../../../defaults'
import {attachmentURLs, pick, omit} from '../../../../utils'
import {hasPermissions} from '../../../utils'
import type {HTTPAttachmentData} from 'discord.js'
import type {
  APIAllowedMentions,
  APIEmbed,
  Snowflake
} from 'discord-api-types/v9'
import type {Backend} from '../../../../Backend'
import type {Embed, Guild, Message} from '../../../../types'
import type {AttachmentURLs} from '../../../../utils'

// #region Mentions

interface Mentions {
  everyone: boolean
  users: Set<Snowflake>
  roles: Set<Snowflake>
}

const emptyMentions: Mentions = {
  everyone: false,
  users: new Set(),
  roles: new Set()
}

const foldMapMentions = (nodes: readonly md.ASTNode[]): Mentions =>
  nodes.reduce<Mentions>(({everyone, users, roles}, child) => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
    const mentions = getMentions(child)
    return {
      everyone: everyone || mentions.everyone,
      users: new Set([...users, ...mentions.users]),
      roles: new Set([...roles, ...mentions.roles])
    }
  }, emptyMentions)

const getMentions = (node: md.ASTNode): Mentions => {
  switch (node.type) {
    case 'discordEveryone':
    case 'discordHere':
      return {...emptyMentions, everyone: true}
    case 'discordUser':
      return {...emptyMentions, users: new Set([node.id])}
    case 'discordRole':
      return {...emptyMentions, roles: new Set([node.id])}
    default:
      return 'content' in node && typeof node.content != 'string'
        ? foldMapMentions(node.content)
        : emptyMentions
  }
}

const filterMentions = (
  mentions: Mentions,
  allowed: APIAllowedMentions | undefined
): Pick<Mentions, 'everyone'> & Record<'roles' | 'users', Snowflake[]> => {
  const {everyone} = mentions
  const users = [...mentions.users]
  const roles = [...mentions.roles]

  if (!allowed) return {everyone, users, roles}

  const parse = new Set(allowed.parse)
  const allowedUsers = new Set(allowed.users)
  const allowedRoles = new Set(allowed.roles)
  return {
    everyone: everyone && parse.has(AllowedMentionsTypes.Everyone),
    users: parse.has(AllowedMentionsTypes.User)
      ? users
      : users.filter(id => allowedUsers.has(id)),
    roles: parse.has(AllowedMentionsTypes.Role)
      ? roles
      : roles.filter(id => allowedRoles.has(id))
  }
}

export const messageMentionsDetails = (
  backend: Backend,
  guild: Guild | undefined,
  permissions: bigint | undefined,
  content: string,
  allowed: APIAllowedMentions | undefined
): Pick<Message, 'mention_everyone' | 'mention_roles' | 'mentions'> => {
  const mentions = filterMentions(foldMapMentions(md.parser(content)), allowed)
  const canMentionEveryone =
    permissions !== undefined &&
    hasPermissions(permissions, PermissionFlagsBits.MentionEveryone)
  return {
    mention_everyone:
      mentions.everyone && guild !== undefined && canMentionEveryone,
    mentions: mentions.users.filter(id => backend.allUsers.has(id)),
    mention_roles: guild
      ? mentions.roles.filter(id => {
          const role = guild.roles.get(id)
          return role && (role.mentionable || canMentionEveryone)
        })
      : []
  }
}

// #endregion

// #region Attachments

const ATTACHMENT_SCHEME = 'attachment://'

const resolveURL: {
  <T extends {icon_url?: string}>(
    channelId: Snowflake,
    messageId: Snowflake,
    files: readonly HTTPAttachmentData[] | undefined,
    object: T,
    icon: true
  ): T
  <T extends {url?: string}>(
    channelId: Snowflake,
    messageId: Snowflake,
    files: readonly HTTPAttachmentData[] | undefined,
    object: T,
    icon?: false
  ): T
} = <T extends Record<string, unknown>>(
  channelId: Snowflake,
  messageId: Snowflake,
  files: readonly HTTPAttachmentData[] | undefined,
  object: T,
  icon = false
): T => {
  const fileURL = object[icon ? 'url' : 'icon_url'] as string | undefined
  let urls: AttachmentURLs | undefined
  if (fileURL?.startsWith(ATTACHMENT_SCHEME) ?? false) {
    const file = files?.find(
      ({name}) => name === fileURL!.slice(ATTACHMENT_SCHEME.length)
    )
    if (file) urls = attachmentURLs(channelId, messageId, file.name)
  }
  return {...object, ...urls}
}

export const resolveEmbed =
  (
    channelId: Snowflake,
    messageId: Snowflake,
    files: readonly HTTPAttachmentData[] | undefined
  ) =>
  ({
    title,
    description,
    url,
    timestamp,
    color,
    footer,
    image,
    thumbnail,
    author,
    fields
  }: APIEmbed): Embed =>
    defaults.embed({
      title,
      description,
      url,
      timestamp,
      color: color === undefined ? undefined : Math.trunc(color),
      // Not bothering with proxied URls that an
      // https://images-ext-1.discordapp.net/external/aVEDne7SrZM-yQgNzl8kSN6ljPFN4SbV5ev7oSSji5Q/https/some-website.com/image.png
      footer: footer
        ? resolveURL(
            channelId,
            messageId,
            files,
            omit(footer, 'proxy_icon_url'),
            true
          )
        : undefined,
      // Also not bothering with height/widths
      image: image
        ? resolveURL(channelId, messageId, files, pick(image, 'url'))
        : undefined,
      thumbnail: thumbnail
        ? resolveURL(channelId, messageId, files, pick(thumbnail, 'url'))
        : undefined,
      author: author
        ? resolveURL(
            channelId,
            messageId,
            files,
            omit(author, 'proxy_icon_url'),
            true
          )
        : undefined,
      fields: fields?.slice(0, 25)
    })

// #endregion

export const messagesIntent = (guild: Guild | undefined): GatewayIntentBits =>
  guild ? GatewayIntentBits.GuildMessages : GatewayIntentBits.DirectMessages
