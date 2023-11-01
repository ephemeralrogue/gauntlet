import {RESTJSONErrorCodes} from 'discord-api-types/v9'
import * as Discord from 'discord.js'
import {getMatchers} from 'expect/build/jestMatchersObject'
import type {SyncExpectationResult} from 'expect/build/types'

type IncompatibleExpectType = [__incompatibleExpectType: never]
type OnlyType<T, U, A extends unknown[] = []> = T extends U
  ? A
  : IncompatibleExpectType

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toResolve(...args: OnlyType<T, Promise<unknown>>): Promise<void>
      toStrictEqualMapEntries(
        expectedEntries: T extends Map<infer K, infer V>
          ? Iterable<readonly [K, V]>
          : never
      ): R
      toEqualBitfield(
        ...args: T extends Discord.BitField<infer S, infer N> | undefined
          ? [bits: Discord.BitFieldResolvable<S, N>]
          : IncompatibleExpectType
      ): R
      toThrowAPIError(
        ...args: OnlyType<T, Promise<unknown>, [code: RESTJSONErrorCodes]>
      ): Promise<void>
      toThrowAPIFormError(...args: OnlyType<T, Promise<unknown>>): Promise<void>
    }
  }
}

declare module 'discord.js' {
  interface BitField<S, N> {
    ['constructor']: typeof BitField
  }
}

// First two lines are the expect(received).toBeInstanceOf(expected)
const removeMatcherHint = ({message}: SyncExpectationResult): string =>
  message().split('\n').slice(2).join('\n')

const toThrowAPIError = async (
  name: string,
  form: boolean,
  context: jest.MatcherContext,
  received: Promise<unknown>,
  code: RESTJSONErrorCodes
): Promise<jest.CustomMatcherResult> => {
  const {toBeInstanceOf, toMatchObject} = getMatchers() as unknown as Record<
    'toBeInstanceOf' | 'toMatchObject',
    (
      this: jest.MatcherContext,
      received: unknown,
      expected: unknown
    ) => SyncExpectationResult
  >

  const {isNot, promise, utils} = context
  const matcherHint = (): string =>
    `${utils.matcherHint(name, 'promise', 'code', {isNot, promise})}
`

  try {
    const result = await received
    return {
      pass: false,
      message: (): string => `${matcherHint()}
Expected: promise to reject to a Discord API ${form ? 'form ' : ''}error${
        form ? '' : ` with code ${code}`
      }
Received: resolved with ${utils.printReceived(result)}`
    }
  } catch (error: unknown) {
    const instanceOfResult = toBeInstanceOf.call(
      context,
      error,
      Discord.DiscordAPIError
    )
    if (
      (!instanceOfResult.pass && !isNot) ||
      (instanceOfResult.pass && isNot)
    ) {
      return {
        pass: instanceOfResult.pass,
        message: (): string => `${matcherHint()}
${removeMatcherHint(instanceOfResult)}`
      }
    }

    const matchObjectInput: Partial<Discord.DiscordAPIError> = {code}
    const matchObjectResult = toMatchObject.call(
      context,
      error,
      matchObjectInput
    )
    return {
      pass: matchObjectResult.pass,
      message: (): string => `${matcherHint()}
${removeMatcherHint(matchObjectResult)}`
    }
  }
}

expect.extend({
  async toResolve(
    this: jest.MatcherContext,
    received: Promise<unknown>
  ): Promise<jest.CustomMatcherResult> {
    const {isNot, promise, utils} = this

    let result: unknown
    let pass: boolean
    try {
      result = await received
      pass = true
    } catch (error: unknown) {
      result = error
      pass = false
    }

    return {
      pass,
      message: (): string => `${utils.matcherHint(
        'toResolve',
        'promise',
        undefined,
        {isNot, promise}
      )}

Expected: promise ${isNot ? 'not ' : ''}to resolve
Received: ${pass ? 'resolved' : 'rejected'} with ${utils.printReceived(result)}`
    }
  },

  toStrictEqualMapEntries<K, V>(
    this: jest.MatcherContext,
    received: Map<K, V>,
    expectedEntries: Iterable<readonly [K, V]>
  ) {
    const {isNot, promise, utils} = this
    const expected = new Map(expectedEntries)

    const pass = ((): boolean => {
      if (received.size !== expected.size) return false
      for (const [key, value] of expected) {
        if (
          !received.has(key) ||
          !this.equals(received.get(key), value, undefined, true)
        )
          return false
      }
      return true
    })()

    return {
      pass,
      message: (): string => `${utils.matcherHint(
        'toStrictEqualMapEntries',
        undefined,
        'expectedEntries',
        {isNot, promise}
      )}

Expected: ${pass ? 'not ' : ''}${utils.printExpected(expected)}
Received: ${utils.printReceived(received)}`
    }
  },

  toEqualBitfield<S extends string, N extends bigint | number>(
    this: jest.MatcherContext,
    received: Discord.BitField<S, N> | undefined,
    bits: Discord.BitFieldResolvable<S, N>
  ): jest.CustomMatcherResult {
    const {isNot, promise, utils} = this
    const matcherHint = (): string =>
      `${utils.matcherHint('toEqualBitfield', 'received', 'expected', {
        isNot,
        promise,
        ...(received instanceof Discord.Permissions
          ? {comment: 'Not checking admin'}
          : {})
      })}

`
    if (!received) {
      return {
        pass: false,
        message: (): string => `${matcherHint()}
Expected: ${utils.printExpected(bits)}${
          bits instanceof Discord.BitField
            ? ` (${utils.printExpected(bits.toArray())})`
            : ''
        }
Received: ${utils.printReceived(received)}`
      }
    }

    const expected = new received.constructor(bits)
    const pass = received.equals(expected)
    return {
      pass,
      message: (): string =>
        `${matcherHint()}
Expected: ${isNot ? 'not ' : ''}${utils.printExpected(expected.bitfield)}
Received: ${utils.printReceived(received.bitfield)}
${
  pass
    ? `Flags: ${utils.stringify(expected.toArray())}`
    : utils.printDiffOrStringify(
        expected.toArray(false),
        // Don't check admin for Permissions
        received.toArray(false),
        'Expected flags',
        'Received flags',
        false
      )
}`
    }
  },

  async toThrowAPIError(
    this: jest.MatcherContext,
    received: Promise<unknown>,
    code: RESTJSONErrorCodes
  ) {
    return toThrowAPIError('toThrowAPIError', false, this, received, code)
  },
  async toThrowAPIFormError(
    this: jest.MatcherContext,
    received: Promise<unknown>
  ) {
    // TODO: test form error details
    return toThrowAPIError(
      'toThrowAPIFormError',
      true,
      this,
      received,
      RESTJSONErrorCodes.InvalidFormBodyOrContentType
    )
  }
})
