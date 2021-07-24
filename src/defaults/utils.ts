import {removeUndefined} from '../utils'
import type {PartialDeep} from '../types'

export type Defaults<T> = (partial?: PartialDeep<T>) => T

export const createDefaults =
  <T>(fn: Defaults<T>): Defaults<T> =>
  (partial): T =>
    fn(removeUndefined(partial))
