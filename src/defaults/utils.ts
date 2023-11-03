import { removeUndefined } from '../utils.ts';
import type { PartialDeep } from '../types/index.ts';
import type { RemoveUndefined } from '../utils.ts';

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
