declare global {
  namespace jest {
    interface Matchers<R, T> {
      toResolve(
        ...args: T extends Promise<unknown> ? [] : [never]
      ): Promise<void>
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
  }
})

export {}
