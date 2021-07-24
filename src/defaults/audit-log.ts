import {
  AuditLogEvent,
  AuditLogOptionsType,
  ChannelType,
  IntegrationExpireBehavior,
  PermissionFlagsBits,
  WebhookType
} from 'discord-api-types/v9'
import {ChangeOverwriteType} from '../types/patches'
import {snowflake} from '../utils'
import {
  DEFAULT_CHANNEL_NAME,
  DEFAULT_CUSTOM_EMOJI_NAME,
  DEFAULT_GUILD_NAME,
  DEFAULT_INTEGRATION_NAME,
  DEFAULT_NEW_GUILD_NAME,
  DEFAULT_NEW_INTEGRATION_NAME,
  DEFAULT_NEW_WEBHOOK_NAME,
  DEFAULT_PERMISSIONS_STRING,
  DEFAULT_ROLE_NAME,
  DEFAULT_STAGE_TOPIC,
  DFEAULT_STICKER_DESCRIPTION,
  DEFAULT_STICKER_NAME,
  DEFAULT_WEBHOOK_NAME
} from './constants'
import {createDefaults as d} from './utils'
import type {RequireKeys} from '../utils'
import type {
  AuditLogChange,
  AuditLogChangeKeyId,
  AuditLogChangeKeyOverwriteType,
  AuditLogEntry,
  AuditLogOptions,
  PartialDeep,
  Snowflake
} from '../types'

const overwriteTypeChangeToOptions: Readonly<
  Record<ChangeOverwriteType, AuditLogOptionsType>
> = {
  [ChangeOverwriteType.Role]: AuditLogOptionsType.Role,
  [ChangeOverwriteType.Member]: AuditLogOptionsType.Member
}

// TODO: refactor so it's <= 200 lines
// eslint-disable-next-line complexity, max-lines-per-function -- mainly due to the switch case
export const auditLogEntry = d<AuditLogEntry>(entry => {
  const base: RequireKeys<
    PartialDeep<AuditLogEntry>,
    'action_type' | 'id' | 'user_id'
  > = {
    user_id: snowflake(),
    id: snowflake(),
    // I would just check for if base.action_type is undefined in the switch,
    // but due to https://github.com/microsoft/TypeScript/issues/29827 TS
    // doesn't narrow the type of base even when it knows base.action_type
    // isn't undefined for e.g. case AuditLogEvent.CHANNEL_CREATE
    action_type: AuditLogEvent.GuildUpdate,
    ...entry
  }

  const withTarget = (): RequireKeys<typeof base, 'target_id'> => ({
    target_id: snowflake(),
    ...base
  })

  const changes = (
    ..._changes: AuditLogChange[]
  ): Required<Pick<AuditLogEntry, 'changes'>> => ({
    changes: base.changes?.length ?? 0 ? base.changes! : _changes
  })

  const targetAndChanges = (
    options?: AuditLogOptions,
    ..._changes: readonly AuditLogChange[]
  ): AuditLogEntry => ({
    ...withTarget(),
    ...changes(..._changes),
    options
  })

  const targetAndChangesNoOptions = (
    ..._changes: readonly AuditLogChange[]
  ): AuditLogEntry => targetAndChanges(undefined, ..._changes)

  const targetNoChanges = (options: AuditLogOptions): AuditLogEntry => ({
    ...withTarget(),
    changes: undefined,
    options
  })

  const noTarget = (
    options?: AuditLogOptions,
    ..._changes: readonly AuditLogChange[]
  ): AuditLogEntry => ({
    ...base,
    target_id: null,
    ...(_changes.length ? changes(..._changes) : {changes: undefined}),
    options
  })

  const noTargetOrOptions = (
    ..._changes: readonly AuditLogChange[]
  ): AuditLogEntry => noTarget(undefined, ..._changes)

  const createOrDelete = (
    createEvent: AuditLogEvent,
    getEntry: (key: 'new_value' | 'old_value') => AuditLogEntry
  ): AuditLogEntry =>
    getEntry(base.action_type === createEvent ? 'new_value' : 'old_value')

  switch (base.action_type) {
    case AuditLogEvent.GuildUpdate:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_GUILD_NAME,
        new_value: DEFAULT_NEW_GUILD_NAME
      })

    case AuditLogEvent.ChannelCreate:
    case AuditLogEvent.ChannelDelete:
      return createOrDelete(AuditLogEvent.ChannelCreate, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_CHANNEL_NAME},
          {key: 'type', [key]: ChannelType.GuildText},
          {key: 'permission_overwrites', [key]: []},
          {key: 'nsfw', [key]: false},
          {key: 'rate_limit_per_user', [key]: 0}
        )
      )

    case AuditLogEvent.ChannelUpdate:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_CHANNEL_NAME,
        new_value: 'important-news'
      })

    case AuditLogEvent.ChannelOverwriteCreate:
    case AuditLogEvent.ChannelOverwriteUpdate:
    case AuditLogEvent.ChannelOverwriteDelete: {
      const id =
        base.options?.id ??
        ((): Snowflake | undefined => {
          const foundChange = base.changes?.find(
            (change): change is AuditLogChangeKeyId => change.key === 'id'
          )
          return foundChange?.old_value ?? foundChange?.new_value
        })() ??
        snowflake()
      const type =
        base.options?.type ??
        ((): AuditLogOptionsType | undefined => {
          const foundChange = base.changes?.find(
            (change): change is AuditLogChangeKeyOverwriteType =>
              change.key === 'type'
          )
          const foundType = foundChange?.old_value ?? foundChange?.new_value
          return foundType === undefined
            ? undefined
            : overwriteTypeChangeToOptions[foundType]
        })() ??
        AuditLogOptionsType.Member
      return targetAndChanges(
        {
          id,
          type,
          role_name:
            type === AuditLogOptionsType.Role
              ? base.options?.role_name ?? DEFAULT_ROLE_NAME
              : undefined
        },
        {
          key: 'allow',
          old_value:
            base.action_type === AuditLogEvent.ChannelOverwriteCreate
              ? undefined
              : '0',
          new_value:
            base.action_type === AuditLogEvent.ChannelOverwriteDelete
              ? undefined
              : PermissionFlagsBits.ViewChannel.toString()
        }
      )
    }

    case AuditLogEvent.MemberKick:
    case AuditLogEvent.MemberBanAdd:
    case AuditLogEvent.MemberBanRemove:
    case AuditLogEvent.BotAdd:
      return {
        ...withTarget(),
        changes: undefined,
        options: undefined
      }

    case AuditLogEvent.MemberPrune:
      return noTarget({
        ...base.options,
        delete_member_days: '1',
        members_removed: '1'
      })

    case AuditLogEvent.MemberUpdate:
      return targetAndChangesNoOptions({
        key: 'deaf',
        old_value: false,
        new_value: true
      })

    case AuditLogEvent.MemberRoleUpdate:
      return targetAndChangesNoOptions({
        key: '$add',
        new_value: [{id: snowflake(), name: DEFAULT_ROLE_NAME}]
      })

    case AuditLogEvent.MemberMove:
      return noTarget({
        channel_id: snowflake(),
        count: '1',
        ...base.options
      })

    case AuditLogEvent.MemberDisconnect:
      return noTarget({count: '1', ...base.options})

    case AuditLogEvent.RoleCreate:
    case AuditLogEvent.RoleDelete:
      return createOrDelete(AuditLogEvent.RoleCreate, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_ROLE_NAME},
          {key: 'permissions', [key]: DEFAULT_PERMISSIONS_STRING},
          {key: 'color', [key]: 0},
          {key: 'hoist', [key]: false},
          {key: 'mentionable', [key]: false}
        )
      )

    case AuditLogEvent.RoleUpdate:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_ROLE_NAME,
        new_value: 'WE DEM BOYZZ!!!!!!'
      })

    case AuditLogEvent.InviteCreate:
    case AuditLogEvent.InviteDelete:
      return createOrDelete(AuditLogEvent.InviteCreate, key =>
        noTargetOrOptions(
          {key: 'code', [key]: 'aaaaaaaa'},
          {key: 'channel_id', [key]: snowflake()},
          {key: 'inviter_id', [key]: snowflake()},
          {key: 'uses', [key]: 0},
          {key: 'max_uses', [key]: 0},
          {key: 'max_age', [key]: 86_400},
          {key: 'temporary', [key]: false}
        )
      )

    case AuditLogEvent.InviteUpdate:
      return noTargetOrOptions({key: 'max_uses', old_value: 0, new_value: 1})

    case AuditLogEvent.WebhookCreate:
    case AuditLogEvent.WebhookDelete:
      return createOrDelete(AuditLogEvent.WebhookCreate, key =>
        targetAndChangesNoOptions(
          {key: 'type', [key]: WebhookType.Incoming},
          {key: 'channel_id', [key]: snowflake()},
          {key: 'name', [key]: DEFAULT_WEBHOOK_NAME}
        )
      )

    case AuditLogEvent.WebhookUpdate:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_WEBHOOK_NAME,
        new_value: DEFAULT_NEW_WEBHOOK_NAME
      })

    case AuditLogEvent.EmojiCreate:
    case AuditLogEvent.EmojiUpdate:
    case AuditLogEvent.EmojiDelete:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value:
          base.action_type === AuditLogEvent.EmojiCreate
            ? undefined
            : 'emoji_1',
        new_value:
          base.action_type === AuditLogEvent.EmojiDelete
            ? undefined
            : DEFAULT_CUSTOM_EMOJI_NAME
      })

    case AuditLogEvent.MessageDelete:
    case AuditLogEvent.MessageBulkDelete:
      return targetNoChanges({
        channel_id:
          base.action_type === AuditLogEvent.MessageDelete
            ? snowflake()
            : undefined,
        count: '2',
        ...base.options
      })

    case AuditLogEvent.MessagePin:
    case AuditLogEvent.MessageUnpin:
      return targetNoChanges({
        channel_id: snowflake(),
        message_id: snowflake(),
        ...base.options
      })

    case AuditLogEvent.IntegrationCreate:
    case AuditLogEvent.IntegrationDelete:
      return createOrDelete(AuditLogEvent.IntegrationCreate, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_INTEGRATION_NAME},
          {key: 'type', [key]: 'twitch'},
          {key: 'enable_emoticons', [key]: false},
          {key: 'expire_behavior', [key]: IntegrationExpireBehavior.RemoveRole},
          {key: 'expire_grace_period', [key]: 1}
        )
      )

    case AuditLogEvent.IntegrationUpdate:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_INTEGRATION_NAME,
        new_value: DEFAULT_NEW_INTEGRATION_NAME
      })

    case AuditLogEvent.StageInstanceCreate:
    case AuditLogEvent.StageInstanceDelete:
      return createOrDelete(base.action_type, key =>
        targetAndChanges(
          {channel_id: snowflake()},
          {
            key: 'topic',
            [key]: DEFAULT_STAGE_TOPIC
          }
        )
      )
    case AuditLogEvent.StageInstanceUpdate:
      return targetAndChanges(
        {channel_id: snowflake()},
        {
          key: 'topic',
          old_value: DEFAULT_STAGE_TOPIC,
          new_value: 'new stage topic'
        }
      )

    case AuditLogEvent.StickerCreate:
    case AuditLogEvent.StickerDelete:
      return createOrDelete(base.action_type, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_STICKER_NAME},
          {key: 'description', [key]: DFEAULT_STICKER_DESCRIPTION}
        )
      )
    case AuditLogEvent.StickerUpdate:
      return targetAndChangesNoOptions({
        key: 'description',
        old_value: DFEAULT_STICKER_DESCRIPTION,
        new_value: 'new sticker description'
      })
  }
})
