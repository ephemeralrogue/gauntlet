import {RESTJSONErrorCodes} from 'discord-api-types/v8'
import * as D from 'discord.js'
import {getMatchers} from 'expect/build/jestMatchersObject'
import type {SyncExpectationResult} from 'expect/build/types'

type OnlyType<T, U, A extends unknown[] = []> = T extends U
  ? A
  : [__incompatibleExpectType: never]

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toResolve(...args: OnlyType<T, Promise<unknown>>): Promise<void>
      toThrowAPIError(
        ...args: OnlyType<T, Promise<unknown>, [code: RESTJSONErrorCodes]>
      ): Promise<void>
      toThrowAPIFormError(...args: OnlyType<T, Promise<unknown>>): Promise<void>
    }
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
  const {toBeInstanceOf, toMatchObject} = getMatchers() as Record<
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
      D.DiscordAPIError
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

    const matchObjectInput: Partial<D.DiscordAPIError> = {code}
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
      message: (): string => `${this.utils.matcherHint(
        'toResolve',
        'promise',
        undefined,
        {isNot: this.isNot, promise: this.promise}
      )}

Expected: promise ${pass ? 'not ' : ''}to resolve
Received: ${pass ? 'resolved' : 'rejected'} with ${this.utils.printReceived(
        result
      )}`
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
