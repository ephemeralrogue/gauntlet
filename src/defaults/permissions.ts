import {snowflake} from '../utils'
import {DEFAULT_PERMISSIONS_STRING, DEFAULT_ROLE_NAME} from './constants'
import type {APIRole} from 'discord-api-types/v8'
import type {Defaults} from '../resolve-collection'

export const role: Defaults<APIRole> = _role => ({
  id: snowflake(),
  name: DEFAULT_ROLE_NAME,
  color: 0,
  hoist: false,
  position: 0,
  permissions: DEFAULT_PERMISSIONS_STRING,
  managed: false,
  mentionable: false,
  ..._role
})
