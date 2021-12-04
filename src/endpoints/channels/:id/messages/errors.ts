import {
  AllowedMentionsTypes,
  ButtonStyle,
  ChannelType,
  ComponentType,
  PermissionFlagsBits
} from 'discord-api-types/v9'
import {o, filterMap} from '../../../../utils'
import {getChannel, getPermissions, hasPermissions} from '../../../utils'
import {error, errors, formBodyErrors} from '../../../../errors'
import type {
  APIActionRowComponent,
  APIAllowedMentions,
  APIButtonComponent,
  APIEmbed,
  APIMessageComponentEmoji,
  APISelectMenuComponent,
  RESTPatchAPIChannelMessageJSONBody
} from 'discord-api-types/v9'
import type {Backend} from '../../../../Backend'
import type {FormBodyError, FormBodyErrors, Request} from '../../../../errors'
import type {
  Guild,
  GuildChannel,
  Snowflake,
  TextBasedChannel
} from '../../../../types'

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
export const getAndCheckChannel = (
  backend: Backend,
  channelId: Snowflake,
  request: Request
): [Guild | undefined, TextBasedChannel] => {
  const [guild, channel] = getChannel(backend)(channelId)
  if (!channel) error(request, errors.UNKNOWN_CHANNEL)
  if (!textChannelTypes.has(channel.type))
    error(request, errors.NON_TEXT_CHANNEL)
  return [guild, channel as TextBasedChannel]
}

export const getAndCheckPermissions = (
  request: Request,
  userId: Snowflake,
  guild: Guild,
  channel: GuildChannel
): bigint => {
  const permissions = getPermissions(guild, guild.members.get(userId)!, channel)
  if (!hasPermissions(permissions, PermissionFlagsBits.ViewChannel))
    error(request, errors.MISSING_ACCESS)
  return permissions
}

export const isEmpty = (
  content: string | undefined,
  embeds: readonly APIEmbed[] | undefined
): boolean => !(content ?? '') && !(embeds?.length ?? 0)

// #region Form errors

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

const getComponentEmojiErrs = (
  backend: Backend,
  {id}: APIMessageComponentEmoji
): FormBodyErrors | undefined => {
  if (id !== undefined && !backend.guildEmojis.has(id))
    return {id: {_errors: [formBodyErrors.BUTTON_COMPONENT_INVALID_EMOJI]}}
  // TODO: check standard emoji
}

const getSelectMenuErrs = (
  backend: Backend,
  {
    custom_id,
    placeholder,
    options = [],
    min_values = 1,
    max_values = 1
  }: APISelectMenuComponent
): FormBodyErrors | undefined => {
  const optionsErrs: FormBodyErrors[string] = options.length
    ? options.length > 25
      ? {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 25)]}
      : Object.fromEntries(
          filterMap(options, ({label, value, description, emoji}, i) => {
            const emojiErrs = emoji && getComponentEmojiErrs(backend, emoji)
            const errs = {
              ...lengthErrorRequired(label, 100, 'label'),
              ...lengthErrorRequired(value, 100, 'value'),
              ...lengthError(description, 100, 'value'),
              ...(emojiErrs ? {emoji: emojiErrs} : {})
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
  backend: Backend,
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
      const emojiErrs = b.emoji && getComponentEmojiErrs(backend, b.emoji)
      const errs: FormBodyErrors = {
        ...lengthErrorRequired(b.label, 80, 'label'),
        // TODO: url validation
        ...(isLink && b.url.length > 512
          ? {url: {_errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(512)]}}
          : {}),
        ...(emojiErrs ? {emoji: emojiErrs} : {}),
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

const getActionRowComponentErrors = (
  backend: Backend,
  {components}: APIActionRowComponent
): FormBodyErrors | undefined => {
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
    const errs = getSelectMenuErrs(
      backend,
      components[0] as APISelectMenuComponent
    )
    return errs ? {components: {0: errs}} : undefined
  }

  // Buttons
  if (components.length > 5) return layoutWidthExceededError(5)
  const buttonsErrs = getButtonsErrs(
    backend,
    components as APIButtonComponent[]
  )
  return Object.keys(buttonsErrs).length ? {components: buttonsErrs} : undefined
}

export const getFormErrors = (
  backend: Backend,
  data: RESTPatchAPIChannelMessageJSONBody
): FormBodyErrors => {
  const {allowed_mentions, embeds} = data
  const content = data.content ?? ''
  const components = data.components ?? []
  const embedsErrs = embeds?.length ?? 0 ? getEmbedsErrors(embeds!) : {}
  const componentsErrs: FormBodyErrors[string] =
    components.length > 5
      ? {_errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(5)]}
      : Object.fromEntries(
          filterMap(components, (component, i) => {
            const errs = getActionRowComponentErrors(backend, component)
            return errs ? ([i, errs] as const) : undefined
          })
        )
  const allowedMentionsErrs = allowed_mentions
    ? getAllowedMentionsErrors(allowed_mentions)
    : {}
  const errs: FormBodyErrors = {
    ...lengthError(content, 2000, 'content'),
    ...o('embed', embedsErrs),
    ...o('components', componentsErrs),
    ...o('allowed_mentions', allowedMentionsErrs)
  }
  return errs
}

// #endregion
