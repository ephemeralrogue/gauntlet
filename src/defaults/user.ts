import { snowflake } from '../utils.ts';
import { createDefaults as d } from './utils.ts';
import type {
  User,
  PartialDeep
} from '../types/index.ts';
import type {
  RemoveUndefined,
  RequireKeys
} from '../utils.ts';

const discriminatorMap = new Map<string, number>()

export const user = d<User>(_user => {
  const base: RequireKeys<
    RemoveUndefined<PartialDeep<User>>,
    'avatar' | 'id' | 'username'
  > = {
    id: snowflake(),
    username: 'Nelly',
    avatar: null,
    ..._user
  }
  if (base.discriminator !== undefined) return base as User
  const discriminator = discriminatorMap.has(base.username)
    ? discriminatorMap.get(base.username)! + 1
    : 0
  discriminatorMap.set(base.username, discriminator)
  return {
    ...base,
    discriminator: discriminator.toString().padStart(4, '0')
  }
})
