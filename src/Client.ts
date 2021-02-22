import {GatewayDispatchEvents, GatewayOPCodes} from 'discord-api-types/v8'
import * as D from 'discord.js'
import WebSocketShard from '../node_modules/discord.js/src/client/websocket/WebSocketShard'
import {Backend, api} from './Backend'
import * as convert from './convert'
import * as defaults from './defaults'
import type {APIUser} from 'discord-api-types/v8'
import type {ClientOptions} from 'discord.js'
import type {EmitPacket} from './Backend'
import type {ClientData, ResolvedClientData} from './Data'

const _mockClient = (
  backend: Backend,
  client: D.Client,
  {application}: ClientData = {}
): void => {
  const data = backend['resolvedData']

  // Stop the RESTManager from setting an interval
  client.options.restSweepInterval = 0

  const app = defaults.clientDataApplication(application)
  const user: APIUser = {
    ...(data.users.get(app.id) ??
      data.integration_applications.get(app.id)?.bot ??
      defaults.user()),
    bot: true
  }
  data.users.set(user.id, user)
  if (data.integration_applications.has(app.id))
    data.integration_applications.get(app.id)!.bot = user
  else {
    data.integration_applications.set(
      app.id,
      defaults.integrationApplication({id: app.id, bot: user})
    )
  }

  const emitPacket: EmitPacket = (t, d) => {
    client.ws['handlePacket'](
      {op: GatewayOPCodes.Dispatch, t, d},
      client.ws.shards.first()
    )
  }
  const clientData: ResolvedClientData = {
    application: app
  }
  // Initialise the mocked API. This needs to be done with
  // Object.defineProperty because api is originally a getter
  Object.defineProperty(client, 'api', {
    value: api(backend, clientData, emitPacket),
    configurable: true
  })

  // Initialise the client user
  client.user = new D.ClientUser(client, user)

  // Create a shard
  const shard = new WebSocketShard(client.ws, 0)
  client.ws.shards.set(0, shard)

  // Make the websocket manager ready to receive packets
  client.ws['triggerClientReady']()

  if (data.guilds.size) {
    // Make each of the guilds available
    const convertGuild = convert.guildCreateGuild(data, clientData)
    for (const [, guild] of data.guilds)
      emitPacket(GatewayDispatchEvents.GuildCreate, convertGuild(guild))
  }
}

// Explicit annotation to avoid ugly type in declaration file
/**
 * Mocks a Discord.js client. The `GUILD_CREATE` events for the guilds in
 * `backend` are immediately emitted.
 *
 * @param client The Discord.js client.
 * @param data The data for the client.
 * @param backend The backend. Defaults to `new Backend()`.
 */
export const mockClient: (
  client: D.Client,
  data?: ClientData,
  backend?: Backend
) => void = (client, data, backend = new Backend()): void => {
  // Clear RESTManager interval
  client.options.restSweepInterval = 0
  for (const interval of client['_intervals']) client.clearInterval(interval)

  _mockClient(backend, client, data)
}

export class Client extends D.Client {
  declare user: D.ClientUser

  constructor(
    options: Readonly<ClientOptions>,
    data?: ClientData,
    backend: Backend = new Backend()
  ) {
    // Stop the RESTManager from setting an interval
    super({...options, restSweepInterval: 0})

    _mockClient(backend, this, data)
  }
}
