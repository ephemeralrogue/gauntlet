import {snowflake} from './utils'
import type {APIGuildIntegrationApplication} from 'discord-api-types/v8'
import type {
  ClientData,
  ClientDataApplication,
  Data,
  DataGuild,
  DataPartialDeep
} from './types'
import type {Fn1, ReadonlyNonEmptyArray} from './utils'

export interface CombinatorData {
  data?: Data
  clientData?: ClientData
}

export type Combinator = (input?: CombinatorData) => CombinatorData

export const botData = (
  app: DataPartialDeep<
    APIGuildIntegrationApplication & ClientDataApplication
  > = {}
): Combinator => ({data, clientData} = {}) => {
  const id = app.id ?? snowflake()
  return {
    data: {
      ...data,
      applications: [...(data?.applications ?? []), {...app, id}]
    },
    clientData: {...clientData, application: {...app, id}}
  }
}

export const guildWithClient = (
  guild: DataPartialDeep<DataGuild> = {}
): Combinator => (input = {}) => {
  const {data, clientData} =
    input.clientData?.application?.id === undefined ? botData()(input) : input
  const application = data?.applications?.find(
    // botData results in clientData.application.id always being defined
    app => app.id === clientData!.application!.id!
  )
  const id = application?.bot?.id ?? snowflake()
  return {
    data: {
      ...data,
      applications: [
        ...(data?.applications?.filter(app => app !== application) ?? []),
        {...application, bot: {...application?.bot, id}}
      ],
      guilds: [
        ...(data?.guilds ?? []),
        {
          ...guild,
          members:
            guild.members?.some(member => member.id === id) ?? false
              ? guild.members
              : [...(guild.members ?? []), {id}]
        }
      ]
    },
    clientData
  }
}

// Adapted from https://github.com/babakness/pipe-and-compose-types/blob/3ccfc38c8cab1a26eda4d5e37d30c8a60c62f8a6/index.ts#L38
type _Pipe<
  Fns extends readonly Fn1[],
  PrevFn extends Fn1,
  InitArg,
  FinalReturn
> = Fns extends []
  ? (_: InitArg) => FinalReturn
  : Fns extends readonly [infer Head, ...infer Tail]
  ? Tail extends readonly Fn1[]
    ? ReturnType<PrevFn> extends Parameters<Extract<Head, Fn1>>[0]
      ? _Pipe<Tail, Extract<Head, Fn1>, InitArg, ReturnType<Extract<Head, Fn1>>>
      : unknown // incompatible type
    : never
  : never
type Pipe<Fns extends ReadonlyNonEmptyArray<Fn1>> = Fns extends readonly [
  infer Head,
  ...infer Tail
]
  ? _Pipe<
      Extract<Tail, readonly Fn1[]>,
      Extract<Head, Fn1>,
      Parameters<Extract<Head, Fn1>>[0],
      ReturnType<Extract<Head, Fn1>>
    >
  : never

export const pipe = (((...args: [unknown, ...((x: unknown) => unknown)[]]) =>
  args.reduce((acc, f) => (f as (x: unknown) => unknown)(acc))) as unknown) as <
  F extends ReadonlyNonEmptyArray<Fn1>
>(
  ...args: Pipe<F> extends Fn1 ? [Parameters<Pipe<F>>[0], ...F] : [never]
) => ReturnType<Pipe<F>>
