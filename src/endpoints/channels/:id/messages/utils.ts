import md from 'discord-markdown'
import {
  AllowedMentionsTypes,
  ButtonStyle,
  ChannelType,
  ComponentType
} from 'discord-api-types/v9'
import * as defaults from '../../../../defaults'
import {attachmentURLs, pick, o, omit, filterMap} from '../../../../utils'
import {formBodyErrors} from '../../../../errors'
import type {HTTPAttachmentData} from 'discord.js'
import type {
  APIActionRowComponent,
  APIAllowedMentions,
  APIButtonComponent,
  APIEmbed,
  APISelectMenuComponent,
  RESTPostAPIChannelMessageJSONBody,
  Snowflake
} from 'discord-api-types/v9'
import type {FormBodyError, FormBodyErrors} from '../../../../errors'
import type {Channel, Embed, TextBasedChannel} from '../../../../types'
import type {AttachmentURLs, UnStrictPartial, UnUnion} from '../../../../utils'

// #region Errors

const MAX_EMBED_COLOR = 0xff_ff_ff
const MAX_URL = 2048

const textChannelTypes = new Set([
  ChannelType.DM,
  ChannelType.GuildText,
  ChannelType.GuildNews,
  ChannelType.GuildPublicThread,
  ChannelType.GuildPrivateThread,
  ChannelType.GuildNewsThread
])

export const isTextBasedChannel = (
  channel: Channel
): channel is TextBasedChannel => textChannelTypes.has(channel.type)

const lengthErr = (
  value: string | undefined,
  max: number
): FormBodyError | undefined =>
  (value ?? '').length > max
    ? formBodyErrors.BASE_TYPE_MAX_LENGTH(max)
    : undefined

const lengthError = (
  value: string | undefined,
  max: number,
  key: string,
  key2?: string
): FormBodyErrors => {
  const err = lengthErr(value, max)
  if (err) {
    const errs: FormBodyErrors[string] = {_errors: [err]}
    return {
      [key]: key2 === undefined ? errs : {[key2]: errs}
    }
  }
  return {}
}

const lengthErrorRequired = (
  value: string | undefined,
  max: number,
  key: string
): FormBodyErrors => {
  const err =
    value ?? '' ? lengthErr(value, max) : formBodyErrors.BASE_TYPE_REQUIRED
  return err ? {[key]: {_errors: [err]}} : {}
}

const getEmbedErrors = ({
  title = '',
  description = '',
  url,
  timestamp = '',
  color = 0,
  footer,
  image,
  thumbnail,
  video: {url: videoURL} = {},
  provider: {name: providerName} = {},
  author,
  fields
}: APIEmbed): FormBodyErrors => {
  // TODO: fix discord-api-types: these things can be null (well Discord.js uses null anyway)
  const {text: footerText, icon_url: footerIconURL} = footer ?? {text: ''}
  const {url: imageURL} = image ?? {}
  const {url: thumbnailURL} = thumbnail ?? {}
  const {name: authorName = '', url: authorURL} = author ?? {}

  const colorError =
    color < 0
      ? formBodyErrors.NUMBER_TYPE_MIN(0)
      : color > MAX_EMBED_COLOR
      ? formBodyErrors.NUMBER_TYPE_MAX(MAX_EMBED_COLOR)
      : undefined
  const fieldsErrors = fields
    ? Object.fromEntries(
        filterMap(fields, ({name, value}, i) => {
          const errs = {
            ...lengthErrorRequired(name, 256, 'name'),
            ...lengthErrorRequired(value, 1024, 'value')
          }
          return Object.keys(errs).length ? [i, errs] : undefined
        })
      )
    : {}
  return {
    ...lengthError(title, 256, 'title'),
    ...lengthError(description, 4096, 'description'),
    // I'm not bothering to validate URLs
    ...lengthError(url, MAX_URL, 'url'),
    ...(timestamp && new Date(timestamp).toISOString() !== timestamp
      ? {
          timestamp: {
            _errors: [formBodyErrors.DATE_TIME_TYPE_PARSE(timestamp)]
          }
        }
      : {}),
    ...(colorError ? {color: {_errors: [colorError]}} : {}),
    ...lengthError(footerText, 2048, 'footer', 'text'),
    ...lengthError(footerIconURL, MAX_URL, 'footer', 'icon_url'),
    ...lengthError(imageURL, MAX_URL, 'image', 'url'),
    ...lengthError(thumbnailURL, MAX_URL, 'thumbnail', 'url'),
    ...lengthError(videoURL, MAX_URL, 'video', 'url'),
    ...lengthError(providerName, 256, 'provider', 'name'),
    ...lengthError(authorName, 256, 'author', 'name'),
    ...lengthError(authorURL, MAX_URL, 'author', 'url'),
    ...o('fields', fieldsErrors)
  }
}

const getEmbedsErrors = (
  embeds: readonly APIEmbed[]
): FormBodyErrors[string] => {
  if (
    embeds.reduce(
      (acc, {title, description, fields, footer, author}) =>
        acc +
        (title?.length ?? 0) +
        (description?.length ?? 0) +
        (fields?.reduce(
          (acc2, {name, value}) => acc2 + name.length + value.length,
          0
        ) ?? 0) +
        (footer?.text.length ?? 0) +
        (author?.name.length ?? 0),
      0
    ) > 6000
  )
    return {_errors: [formBodyErrors.MAX_EMBED_SIZE_EXCEEDED]}

  return Object.fromEntries(
    filterMap(embeds, (embed, i) => {
      const embedErrors = getEmbedErrors(embed)
      return Object.keys(embedErrors).length ? [i, embedErrors] : undefined
    })
  )
}

const getAllowedMentionsErrors = (
  allowed: APIAllowedMentions
): FormBodyErrors[string] => {
  const lengthOrSetErr = (
    key: Exclude<keyof APIAllowedMentions, 'replied_user'>,
    checkLength = true
  ): FormBodyErrors | undefined => {
    const value: readonly string[] | undefined = allowed[key]
    if (!value) return
    if (checkLength && value.length > 100)
      return {[key]: {_errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(100)]}}
    const errs = Object.fromEntries(
      filterMap(value, (id, i) =>
        value.indexOf(id) < i
          ? [i, {_errors: [formBodyErrors.SET_TYPE_ALREADY_CONTAINS_VALUE]}]
          : undefined
      )
    )
    return o(key, errs)
  }
  const lengthAndSetErrs: FormBodyErrors = {
    ...lengthOrSetErr('parse', false),
    ...lengthOrSetErr('roles'),
    ...lengthOrSetErr('users')
  }
  if (Object.keys(lengthAndSetErrs).length) return lengthAndSetErrs

  const mutuallyExclusiveErr = (
    type: Exclude<AllowedMentionsTypes, AllowedMentionsTypes.Everyone>
  ): readonly FormBodyError[] =>
    (allowed.parse?.includes(type) ?? false) && (allowed[type]?.length ?? 0)
      ? [formBodyErrors.MESSAGE_ALLOWED_MENTIONS_PARSE_EXCLUSIVE(type)]
      : []
  const mutuallyExclusiveErrs = [
    ...mutuallyExclusiveErr(AllowedMentionsTypes.User),
    ...mutuallyExclusiveErr(AllowedMentionsTypes.Role)
  ]
  return mutuallyExclusiveErrs.length ? {_errors: mutuallyExclusiveErrs} : {}
}

const getSelectMenuErrs = ({
  custom_id,
  placeholder,
  options = [],
  min_values = 1,
  max_values = 1
}: APISelectMenuComponent): FormBodyErrors | undefined => {
  const optionsErrs: FormBodyErrors[string] = options.length
    ? options.length > 25
      ? {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 25)]}
      : Object.fromEntries(
          filterMap(options, ({label, value, description, emoji}, i) => {
            const errs = {
              ...lengthErrorRequired(label, 100, 'label'),
              ...lengthErrorRequired(value, 100, 'value'),
              ...lengthError(description, 100, 'value')
            }
            return Object.keys(errs).length ? [i, errs] : undefined
          })
        )
    : {_errors: [formBodyErrors.BASE_TYPE_REQUIRED]}
  const minValuesErr =
    min_values < 0
      ? formBodyErrors.NUMBER_TYPE_MIN(0)
      : min_values > 25
      ? formBodyErrors.NUMBER_TYPE_MAX(25)
      : undefined
  const maxValuesErr =
    max_values < 0
      ? formBodyErrors.NUMBER_TYPE_MIN(1)
      : max_values > 25
      ? formBodyErrors.NUMBER_TYPE_MAX(25)
      : undefined
  const errs1: FormBodyErrors = {
    ...lengthErrorRequired(custom_id, 100, 'custom_id'),
    ...lengthError(placeholder, 100, 'placeholder'),
    ...o('options', optionsErrs),
    ...(minValuesErr ? {min_values: {_errors: [minValuesErr]}} : {}),
    ...(maxValuesErr ? {max_values: {_errors: [maxValuesErr]}} : {})
  }
  if (Object.keys(errs1).length) return errs1

  const errs2: FormBodyErrors = {
    ...(min_values > options.length
      ? {
          min_values: {
            _errors: [
              formBodyErrors.NUMBER_TYPE_MAX(options.length, 'min_values')
            ]
          }
        }
      : {}),
    ...(max_values > options.length
      ? {
          options: {
            _errors: [formBodyErrors.BASE_TYPE_MIN_LENGTH(max_values)]
          }
        }
      : {}),
    ...o(
      'options',
      options.reduce<[FormBodyErrors, Set<string>]>(
        ([obj, existingValues], {value}, i) =>
          existingValues.has(value)
            ? [
                {
                  ...obj,
                  [i]: {
                    _errors: [
                      formBodyErrors.SELECT_COMPONENT_OPTION_VALUE_DUPLICATED
                    ]
                  }
                },
                existingValues
              ]
            : [obj, existingValues.add(value)],
        [{}, new Set()]
      )[0]
    )
  }
  if (Object.keys(errs2).length) return errs2

  return options.filter(opt => opt.default).length > max_values
    ? {
        options: {
          _errors: [formBodyErrors.SELECT_COMPONENT_TOO_MANY_DEFAULT_VALUES]
        }
      }
    : undefined
}

const buttonCustomIdUrlErr: FormBodyErrors[string] = {
  _errors: [formBodyErrors.BUTTON_COMPONENT_CUSTOM_ID_URL_MUTUALLY_EXCLUSIVE]
}

const getButtonsErrs = (
  buttons: readonly APIButtonComponent[]
): FormBodyErrors =>
  buttons.reduce<[FormBodyErrors, Set<string>]>(
    ([obj, existingCustomIds], b, i) => {
      const isLink = b.style === ButtonStyle.Link
      const customIdErr = isLink
        ? undefined
        : b.custom_id
        ? lengthErr(b.custom_id, 100) ??
          (existingCustomIds.has(b.custom_id)
            ? formBodyErrors.COMPONENT_CUSTOM_ID_DUPLICATED
            : undefined)
        : formBodyErrors.BUTTON_COMPONENT_CUSTOM_ID_REQUIRED
      const errs: FormBodyErrors = {
        ...lengthErrorRequired(b.label, 80, 'label'),
        // TODO: url validation
        ...(isLink && b.url.length > 512
          ? {url: {_errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(512)]}}
          : {}),
        // TODO: b.emoji
        ...(customIdErr ? {custom_id: {_errors: [customIdErr]}} : {})
      }
      const buttonErrs = Object.keys(errs).length
        ? errs
        : 'custom_id' in b && 'url' in b
        ? {custom_id: buttonCustomIdUrlErr, url: buttonCustomIdUrlErr}
        : undefined
      return [
        buttonErrs ? {...obj, [i]: buttonErrs} : obj,
        isLink ? existingCustomIds : existingCustomIds.add(b.custom_id)
      ]
    },
    [{}, new Set()]
  )[0]

const getActionRowComponentErrors = ({
  components
}: APIActionRowComponent): FormBodyErrors | undefined => {
  // if (type !== ComponentType.ActionRow)
  //   return {type: {_errors: [formBodyErrors.COMPONENT_TYPE_INVALID]}}

  if (!components.length)
    return {components: {_errors: [formBodyErrors.BASE_TYPE_REQUIRED]}}

  const layoutWidthExceededError = (max: number): FormBodyErrors => ({
    components: Object.fromEntries(
      components
        .slice(max)
        .map((_, i) => [
          i + max,
          {_errors: [formBodyErrors.COMPONENT_LAYOUT_WIDTH_EXCEEDED]}
        ])
    )
  })

  // Select menu
  if (components.some(({type}) => type === ComponentType.SelectMenu)) {
    if (components.length > 1) return layoutWidthExceededError(1)
    const errs = getSelectMenuErrs(components[0] as APISelectMenuComponent)
    return errs ? {components: {0: errs}} : undefined
  }

  // Buttons
  if (components.length > 5) return layoutWidthExceededError(5)
  const buttonsErrs = getButtonsErrs(components as APIButtonComponent[])
  return Object.keys(buttonsErrs).length ? {components: buttonsErrs} : undefined
}

export const getFormErrors = ({
  allowed_mentions,
  components = [],
  content,
  nonce,
  embeds
}: Required<
  UnStrictPartial<
    Pick<
      RESTPostAPIChannelMessageJSONBody,
      'allowed_mentions' | 'components' | 'content' | 'embeds' | 'nonce'
    >
  >
>): FormBodyErrors => {
  const nonceError =
    typeof nonce == 'string' && nonce.length > 25
      ? formBodyErrors.NONCE_TYPE_TOO_LONG
      : typeof nonce == 'number'
      ? Number.isInteger(nonce)
        ? undefined
        : formBodyErrors.NONCE_TYPE_INVALID_TYPE
      : undefined
  const embedsErrs = embeds?.length ?? 0 ? getEmbedsErrors(embeds!) : {}
  const componentsErrs: FormBodyErrors[string] =
    components.length > 5
      ? {_errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(5)]}
      : Object.fromEntries(
          filterMap(components, (component, i) => {
            const errs = getActionRowComponentErrors(component)
            return errs ? ([i, errs] as const) : undefined
          })
        )
  const allowedMentionsErrs = allowed_mentions
    ? getAllowedMentionsErrors(allowed_mentions)
    : {}
  const errs: FormBodyErrors = {
    ...lengthError(content, 2000, 'content'),
    ...(nonceError ? {nonce: {_errors: [nonceError]}} : {}),
    ...o('embed', embedsErrs),
    ...o('components', componentsErrs),
    ...o('allowed_mentions', allowedMentionsErrs)
  }
  return errs
}

// #endregion

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

export const parseMentions = (content: string, allowed?: APIAllowedMentions) =>
  filterMentions(foldMapMentions(md.parser(content)), allowed)

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
      color: color === undefined ? undefined : Math.floor(color),
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
