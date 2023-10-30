import {removeUndefined} from '../utils'
import type {PartialDeep} from '../types'
import type {RemoveUndefined} from '../utils'

export type Defaults<T> = (partial?: PartialDeep<T>) => T

export const createDefaults =
  <T extends object>(
    fn: (x: RemoveUndefined<PartialDeep<T>>) => T
  ): Defaults<T> =>
  (partial): T =>
    fn(
      partial
        ? removeUndefined(partial)
        : ({} as RemoveUndefined<PartialDeep<T>>)
    )
