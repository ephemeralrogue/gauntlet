import {snowflake} from '../utils'
import {DEFAULT_PERMISSIONS, DEFAULT_ROLE_NAME} from './constants'
import {createDefaults as d} from './utils'
import type {DataRole} from '../Data'

export const dataRole = d<DataRole>(_role => ({
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
