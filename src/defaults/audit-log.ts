import {
  AuditLogEvent,
  AuditLogOptionsType,
  ChannelType,
  IntegrationExpireBehavior,
  PermissionFlagsBits,
  WebhookType
} from 'discord-api-types/v8'
import {ChangeOverwriteType} from '../types'
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
  DEFAULT_WEBHOOK_NAME
} from './constants'
import {createDefaults as d} from './utils'
import type {
  APIAuditLogChangeKeyID,
  APIAuditLogOptions,
  Snowflake
} from 'discord-api-types/v8'
import type {RequireKeys} from '../utils'
import type {
  APIAuditLogChange,
  APIAuditLogChangeKeyOverwriteType,
  APIAuditLogEntry,
  D
} from '../types'

const overwriteTypeChangeToOptions: Readonly<
  Record<ChangeOverwriteType, AuditLogOptionsType>
> = {
  [ChangeOverwriteType.Role]: AuditLogOptionsType.Role,
  [ChangeOverwriteType.Member]: AuditLogOptionsType.Member
}

// TODO: refactor so it's <= 200 lines
// eslint-disable-next-line complexity, max-lines-per-function -- mainly due to the switch case
export const auditLogEntry = d<APIAuditLogEntry>(entry => {
  const base: RequireKeys<
    D.PartialDeep<APIAuditLogEntry>,
    'action_type' | 'id' | 'user_id'
  > = {
    user_id: snowflake(),
    id: snowflake(),
    // I would just check for if base.action_type is undefined in the switch,
    // but due to https://github.com/microsoft/TypeScript/issues/29827 TS
    // doesn't narrow the type of base even when it knows base.action_type
    // isn't undefined for e.g. case AuditLogEvent.CHANNEL_CREATE
    action_type: AuditLogEvent.GUILD_UPDATE,
    ...entry
  }

  const withTarget = (): RequireKeys<typeof base, 'target_id'> => ({
    target_id: snowflake(),
    ...base
  })

  const changes = (
    ..._changes: APIAuditLogChange[]
  ): Required<Pick<APIAuditLogEntry, 'changes'>> => ({
    changes: base.changes?.length ?? 0 ? base.changes! : _changes
  })

  const targetAndChanges = (
    options?: APIAuditLogOptions,
    ..._changes: readonly APIAuditLogChange[]
  ): APIAuditLogEntry => ({
    ...withTarget(),
    ...changes(..._changes),
    options
  })

  const targetAndChangesNoOptions = (
    ..._changes: readonly APIAuditLogChange[]
  ): APIAuditLogEntry => targetAndChanges(undefined, ..._changes)

  const targetNoChanges = (options: APIAuditLogOptions): APIAuditLogEntry => ({
    ...withTarget(),
    changes: undefined,
    options
  })

  const noTarget = (
    options?: APIAuditLogOptions,
    ..._changes: readonly APIAuditLogChange[]
  ): APIAuditLogEntry => ({
    ...base,
    target_id: null,
    ...(_changes.length ? changes(..._changes) : {changes: undefined}),
    options
  })

  const noTargetOrOptions = (
    ..._changes: readonly APIAuditLogChange[]
  ): APIAuditLogEntry => noTarget(undefined, ..._changes)

  const createOrDelete = (
    createEvent: AuditLogEvent,
    getEntry: (key: 'new_value' | 'old_value') => APIAuditLogEntry
  ): APIAuditLogEntry =>
    getEntry(base.action_type === createEvent ? 'new_value' : 'old_value')

  switch (base.action_type) {
    case AuditLogEvent.GUILD_UPDATE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_GUILD_NAME,
        new_value: DEFAULT_NEW_GUILD_NAME
      })

    case AuditLogEvent.CHANNEL_CREATE:
    case AuditLogEvent.CHANNEL_DELETE:
      return createOrDelete(AuditLogEvent.CHANNEL_CREATE, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_CHANNEL_NAME},
          {key: 'type', [key]: ChannelType.GUILD_TEXT},
          {key: 'permission_overwrites', [key]: []},
          {key: 'nsfw', [key]: false},
          {key: 'rate_limit_per_user', [key]: 0}
        )
      )

    case AuditLogEvent.CHANNEL_UPDATE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_CHANNEL_NAME,
        new_value: 'important-news'
      })

    case AuditLogEvent.CHANNEL_OVERWRITE_CREATE:
    case AuditLogEvent.CHANNEL_OVERWRITE_UPDATE:
    case AuditLogEvent.CHANNEL_OVERWRITE_DELETE: {
      const id =
        base.options?.id ??
        ((): Snowflake | undefined => {
          const foundChange = base.changes?.find(
            (change): change is APIAuditLogChangeKeyID => change.key === 'id'
          )
          return foundChange?.old_value ?? foundChange?.new_value
        })() ??
        snowflake()
      const type =
        base.options?.type ??
        ((): AuditLogOptionsType | undefined => {
          const foundChange = base.changes?.find(
            (change): change is APIAuditLogChangeKeyOverwriteType =>
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
            base.action_type === AuditLogEvent.CHANNEL_OVERWRITE_CREATE
              ? undefined
              : '0',
          new_value:
            base.action_type === AuditLogEvent.CHANNEL_OVERWRITE_DELETE
              ? undefined
              : PermissionFlagsBits.VIEW_CHANNEL.toString()
        }
      )
    }

    case AuditLogEvent.MEMBER_KICK:
    case AuditLogEvent.MEMBER_BAN_ADD:
    case AuditLogEvent.MEMBER_BAN_REMOVE:
    case AuditLogEvent.BOT_ADD:
      return {
        ...withTarget(),
        changes: undefined,
        options: undefined
      }

    case AuditLogEvent.MEMBER_PRUNE:
      return noTarget({
        ...base.options,
        delete_member_days: '1',
        members_removed: '1'
      })

    case AuditLogEvent.MEMBER_UPDATE:
      return targetAndChangesNoOptions({
        key: 'deaf',
        old_value: false,
        new_value: true
      })

    case AuditLogEvent.MEMBER_ROLE_UPDATE:
      return targetAndChangesNoOptions({
        key: '$add',
        new_value: [{id: snowflake(), name: DEFAULT_ROLE_NAME}]
      })

    case AuditLogEvent.MEMBER_MOVE:
      return noTarget({
        channel_id: snowflake(),
        count: '1',
        ...base.options
      })

    case AuditLogEvent.MEMBER_DISCONNECT:
      return noTarget({count: '1', ...base.options})

    case AuditLogEvent.ROLE_CREATE:
    case AuditLogEvent.ROLE_DELETE:
      return createOrDelete(AuditLogEvent.ROLE_CREATE, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_ROLE_NAME},
          {key: 'permissions', [key]: DEFAULT_PERMISSIONS_STRING},
          {key: 'color', [key]: 0},
          {key: 'hoist', [key]: false},
          {key: 'mentionable', [key]: false}
        )
      )

    case AuditLogEvent.ROLE_UPDATE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_ROLE_NAME,
        new_value: 'WE DEM BOYZZ!!!!!!'
      })

    case AuditLogEvent.INVITE_CREATE:
    case AuditLogEvent.INVITE_DELETE:
      return createOrDelete(AuditLogEvent.INVITE_CREATE, key =>
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

    case AuditLogEvent.INVITE_UPDATE:
      return noTargetOrOptions({key: 'max_uses', old_value: 0, new_value: 1})

    case AuditLogEvent.WEBHOOK_CREATE:
    case AuditLogEvent.WEBHOOK_DELETE:
      return createOrDelete(AuditLogEvent.WEBHOOK_CREATE, key =>
        targetAndChangesNoOptions(
          {key: 'type', [key]: WebhookType.Incoming},
          {key: 'channel_id', [key]: snowflake()},
          {key: 'name', [key]: DEFAULT_WEBHOOK_NAME}
        )
      )

    case AuditLogEvent.WEBHOOK_UPDATE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_WEBHOOK_NAME,
        new_value: DEFAULT_NEW_WEBHOOK_NAME
      })

    case AuditLogEvent.EMOJI_CREATE:
    case AuditLogEvent.EMOJI_UPDATE:
    case AuditLogEvent.EMOJI_DELETE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value:
          base.action_type === AuditLogEvent.EMOJI_CREATE
            ? undefined
            : 'emoji_1',
        new_value:
          base.action_type === AuditLogEvent.EMOJI_DELETE
            ? undefined
            : DEFAULT_CUSTOM_EMOJI_NAME
      })

    case AuditLogEvent.MESSAGE_DELETE:
    case AuditLogEvent.MESSAGE_BULK_DELETE:
      return targetNoChanges({
        channel_id:
          base.action_type === AuditLogEvent.MESSAGE_DELETE
            ? snowflake()
            : undefined,
        count: '2',
        ...base.options
      })

    case AuditLogEvent.MESSAGE_PIN:
    case AuditLogEvent.MESSAGE_UNPIN:
      return targetNoChanges({
        channel_id: snowflake(),
        message_id: snowflake(),
        ...base.options
      })

    case AuditLogEvent.INTEGRATION_CREATE:
    case AuditLogEvent.INTEGRATION_DELETE:
      return createOrDelete(AuditLogEvent.INTEGRATION_CREATE, key =>
        targetAndChangesNoOptions(
          {key: 'name', [key]: DEFAULT_INTEGRATION_NAME},
          {key: 'type', [key]: 'twitch'},
          {key: 'enable_emoticons', [key]: false},
          {key: 'expire_behavior', [key]: IntegrationExpireBehavior.RemoveRole},
          {key: 'expire_grace_period', [key]: 1}
        )
      )

    case AuditLogEvent.INTEGRATION_UPDATE:
      return targetAndChangesNoOptions({
        key: 'name',
        old_value: DEFAULT_INTEGRATION_NAME,
        new_value: DEFAULT_NEW_INTEGRATION_NAME
      })
  }
})
