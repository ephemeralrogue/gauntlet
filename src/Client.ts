import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  GatewayOpcodes
} from 'discord-api-types/v9'
import * as D from 'discord.js'
var WebSocketShard = require('../node_modules/discord.js/src/client/websocket/WebSocketShard')
import {Backend, api} from './Backend'
import * as convert from './convert'
import type {ClientOptions} from 'discord.js'
import type {
  RawClientApplicationData,
  RawUserData
} from 'discord.js/typings/rawDataTypes'
import type {EmitPacket, HasIntents} from './Backend'
import type {Snowflake} from './types'

const _mockClient = (
  client: D.Client,
  backend: Backend,
  applicationId?: Snowflake
): void => {
  // Stop the RESTManager from setting an interval
  client.options.restSweepInterval = 0

  const app =
    (applicationId === undefined
      ? undefined
      : backend.applications.get(applicationId)) ??
    backend.addApplication(
      applicationId === undefined ? {} : {id: applicationId}
    )

  // Create a shard
  const shard = new WebSocketShard(client.ws, 0)
  client.ws.shards.set(0, shard)

  const hasIntents: HasIntents = intents =>
    // Intents are always resolved
    // https://github.com/discordjs/discord.js/blob/0e40f9b86826ba50aa3840807fb86e1bce6b1c3d/src/client/Client.js#L463
    !!((client.options.intents as number) & intents)
  const emitPacket: EmitPacket = (t, d) => {
    client.ws['handlePacket']({op: GatewayOpcodes.Dispatch, t, d}, shard)
  }
  // Initialise the mocked API. This needs to be done with
  // Object.defineProperty because api is originally a getter
  Object.defineProperty(client, 'api', {
    value: api(backend, app.id, hasIntents, emitPacket),
    configurable: true
  })

  // Initialise the client user and application
  // type casts needed because constructors are private
  client.user = new (D.ClientUser as new (
    client: D.Client,
    data: RawUserData
  ) => D.ClientUser)(client, app.bot)
  client.application = new (D.ClientApplication as new (
    client: D.Client,
    data: RawClientApplicationData
  ) => D.ClientApplication)(client, app)

  // Make the websocket manager ready to receive packets
  client.ws['triggerClientReady']()

  // Make each of the guilds available
  if (hasIntents(GatewayIntentBits.Guilds) && backend.guilds.size) {
    // Make each of the guilds available
    const convertGuild = convert.guildCreateGuild(backend, app.id)
    for (const [, guild] of backend.guilds) {
      if (guild.members.has(app.bot.id))
        emitPacket(GatewayDispatchEvents.GuildCreate, convertGuild(guild))
    }
  }
}

// Explicit annotation to avoid ugly type in declaration file
/**
 * Mocks a Discord.js client. The `GUILD_CREATE` events for the guilds in
 * `backend` are immediately emitted.
 *
 * @param client The Discord.js client.
 * @param backend The backend. Defaults to `new Backend()`.
 * @param applicationId The id of the Discord application of the client.
 */
export const mockClient: (
  client: D.Client,
  backend?: Backend,
  applicationId?: Snowflake
) => void = (client, backend = new Backend(), applicationId): void => {
  // Clear RESTManager interval
  client.options.restSweepInterval = 0
  clearInterval(client.sweepMessageInterval)

  _mockClient(client, backend, applicationId)
}

export class Client extends D.Client {
  declare user: D.ClientUser

  constructor(
    options: Readonly<ClientOptions>,
    backend: Backend = new Backend(),
    applicationId?: Snowflake
  ) {
    // Stop the RESTManager from setting an interval
    super({...options, restSweepInterval: 0})

    _mockClient(this, backend, applicationId)
  }
}
