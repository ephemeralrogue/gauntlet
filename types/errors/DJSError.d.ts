import type Messages from './Messages'

type DiscordJSError<T extends Error> = new <K extends keyof Messages>(
  key: K,
  ...args: Messages[K] extends (...args: infer P) => string ? P : []
) => {name: string; code: K} & T

export function register(sym: string, val: any): void
/* eslint-disable no-shadow, @typescript-eslint/naming-convention -- constructors, type declaration */
export const Error: DiscordJSError<Error>
export const TypeError: DiscordJSError<TypeError>
export const RangeError: DiscordJSError<RangeError>
/* eslint-enable no-shadow, @typescript-eslint/naming-convention -- see above */
