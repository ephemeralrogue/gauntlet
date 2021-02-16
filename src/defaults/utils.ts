import {removeUndefined} from '../utils'
import type {Defaults} from '../resolve-collection'

export const createDefaults = <T>(fn: Defaults<T>): Defaults<T> => (
  partial
): T => fn(removeUndefined(partial))
