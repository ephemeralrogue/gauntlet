// Various discord-api-types changes

import type {
  APIAuditLogChange,
  APIAuditLogChangeKey$Add,
  APIAuditLogChangeKey$Remove,
  APIAuditLogEntry,
  APIEmoji,
  APIGuild,
  APIRole,
  GatewayActivity,
  GatewayPresenceUpdate,
  Snowflake
} from 'discord-api-types/v8'
import type {Override, RequireKeys} from '../utils'

// TODO: add this stuff in the Discord docs and discord-api-types
export const enum ChangeOverwriteType {
  Role = 0,
  Member = 1
}

export interface AuditLogChangeKeyOverwriteType {
  key: 'type'
  new_value?: ChangeOverwriteType
  old_value?: ChangeOverwriteType
}

// TODO: add to discord-api-types (APIAuditLogChangeKey$(Add|Remove) has APIRole
// for the changes when it only has the id and name props and the docs say it's
// partial)
type PartialRole = Pick<APIRole, 'id' | 'name'>
export type AuditLogChange =
  | AuditLogChangeKeyOverwriteType
  | Exclude<
      APIAuditLogChange,
      APIAuditLogChangeKey$Add | APIAuditLogChangeKey$Remove
    >
  | {
      key: '$add' | '$remove'
      old_value?: PartialRole[]
      new_value?: PartialRole[]
    }

export type AuditLogEntry = Override<
  APIAuditLogEntry,
  {changes?: AuditLogChange[]}
>

// Bots only receive strings for the buttons
export interface Activity extends GatewayActivity {
  buttons?: string[]
}

export interface Presence extends GatewayPresenceUpdate {
  activities?: Activity[]
}

export interface GuildEmoji
  extends RequireKeys<
    APIEmoji,
    'animated' | 'available' | 'managed' | 'require_colons' | 'roles'
  > {
  id: Snowflake
  name: string
}

export interface Guild extends APIGuild {
  emojis: GuildEmoji[]
}
