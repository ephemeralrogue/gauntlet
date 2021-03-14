import type {
  APIApplication,
  APIGuildIntegrationApplication,
  Snowflake
} from 'discord-api-types/v8'
import type * as D from './Data'

export interface ClientDataApplication
  extends Pick<
    APIApplication,
    Exclude<keyof APIApplication, keyof APIGuildIntegrationApplication>
  > {
  id: Snowflake
}

export interface ResolvedClientData {
  application: ClientDataApplication
}

/** Data specific to a Discord.js client/bot application. */
export type ClientData = D.PartialDeep<ResolvedClientData>
