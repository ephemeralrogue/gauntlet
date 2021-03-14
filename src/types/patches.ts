// Various discord-api-types changes

import type * as DAT from 'discord-api-types/v8'
import type {Override, RequireKeys} from '../utils'

// TODO: add this stuff in the Discord docs and discord-api-types
export const enum ChangeOverwriteType {
  Role = 0,
  Member = 1
}

export interface APIAuditLogChangeKeyOverwriteType {
  key: 'type'
  new_value?: ChangeOverwriteType
  old_value?: ChangeOverwriteType
}

// TODO: add to discord-api-types (APIAuditLogChangeKey$(Add|Remove) has APIRole
// for the changes when it only has the id and name props and the docs say it's
// partial)
type PartialRole = Pick<DAT.APIRole, 'id' | 'name'>
export type APIAuditLogChange =
  | APIAuditLogChangeKeyOverwriteType
  | Exclude<
      DAT.APIAuditLogChange,
      DAT.APIAuditLogChangeKey$Add | DAT.APIAuditLogChangeKey$Remove
    >
  | {
      key: '$add' | '$remove'
      old_value?: PartialRole[]
      new_value?: PartialRole[]
    }

export type APIAuditLogEntry = Override<
  DAT.APIAuditLogEntry,
  {changes?: APIAuditLogChange[]}
>

// Bots only receive strings for the buttons
export interface GatewayActivity extends DAT.GatewayActivity {
  buttons?: string[]
}

export interface GatewayPresenceUpdate extends DAT.GatewayPresenceUpdate {
  activities?: GatewayActivity[]
}

export interface APIGuildEmoji
  extends RequireKeys<
    DAT.APIEmoji,
    'animated' | 'available' | 'managed' | 'require_colons' | 'roles'
  > {
  id: DAT.Snowflake
  name: string
}

export interface APiGuild extends DAT.APIGuild {
  emojis: APIGuildEmoji[]
}
