import {snowflake} from '../utils'
import {DEFAULT_PERMISSIONS, DEFAULT_ROLE_NAME} from './constants'
import {createDefaults as d} from './utils'
import type {Role} from '../types'

export const role = d<Role>(_role => ({
  id: snowflake(),
  name: DEFAULT_ROLE_NAME,
  color: 0,
  hoist: false,
  position: 0,
  permissions: DEFAULT_PERMISSIONS,
  managed: false,
  mentionable: false,
  ..._role
}))
