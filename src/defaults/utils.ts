import {removeUndefined} from '../utils'
import type {D} from '../types'

export type Defaults<T> = (partial?: D.PartialDeep<T>) => T

export const createDefaults = <T>(fn: Defaults<T>): Defaults<T> => (
  partial
): T => fn(removeUndefined(partial))
