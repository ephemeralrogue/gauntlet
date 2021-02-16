import {snowflake} from '../utils'
import {DEFAULT_PERMISSIONS_STRING, DEFAULT_ROLE_NAME} from './constants'
import {createDefaults as d} from './utils'
import type {APIRole} from 'discord-api-types/v8'

export const role = d<APIRole>(_role => ({
  id: snowflake(),
  name: DEFAULT_ROLE_NAME,
  color: 0,
  hoist: false,
  position: 0,
  permissions: DEFAULT_PERMISSIONS_STRING,
  managed: false,
  mentionable: false,
  ..._role
}))
