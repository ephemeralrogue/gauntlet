import type {Timestamp} from '../discord'

export type DKeys<T> = T extends any ? keyof T : never
export type DOmit<T, K extends DKeys<T>> = T extends any ? Omit<T, K> : never

export type Override<T, U> = DOmit<T, Extract<keyof U, DKeys<T>>> & U
export type ValueOf<T> = T[keyof T]
export type RequiredPick<T, K extends keyof T> = T & Required<Pick<T, K>>
export type PartialExcluding<T, K extends keyof T> = RequiredPick<Partial<T>, K>

export const timestamp = (date?: number | Date): Timestamp =>
  (date instanceof Date
    ? date
    : typeof date == 'number'
    ? new Date(date)
    : new Date()
  ).toISOString()
