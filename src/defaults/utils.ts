import {removeUndefined} from '../utils'
import type {DataPartialDeep} from '../types'

export type Defaults<T> = (partial?: DataPartialDeep<T>) => T

export const createDefaults = <T>(fn: Defaults<T>): Defaults<T> => (
  partial
): T => fn(removeUndefined(partial))
