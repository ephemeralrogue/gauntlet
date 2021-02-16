import {snowflake} from '../utils'
import {createDefaults as d} from './utils'
import type {APIUser} from 'discord-api-types/v8'
import type {DataPartialDeep} from '../resolve-collection'
import type {RequireKeys} from '../utils'

const discriminatorMap = new Map<string, number>()

export const user = d<APIUser>(_user => {
  const base: RequireKeys<
    DataPartialDeep<APIUser>,
    'avatar' | 'id' | 'username'
  > = {
    id: snowflake(),
    username: 'Nelly',
    avatar: null,
    ..._user
  }
  if (base.discriminator !== undefined) return base as APIUser
  const discriminator = discriminatorMap.has(base.username)
    ? 0
    : discriminatorMap.get(base.username)! + 1
  discriminatorMap.set(base.username, discriminator)
  return {
    ...base,
    discriminator: discriminator.toString().padStart(4, '0')
  }
})
