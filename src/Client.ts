import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  GatewayOpcodes
} from 'discord-api-types/v9'
import * as D from 'discord.js'
import WebSocketShard from '../node_modules/discord.js/src/client/websocket/WebSocketShard'
import {Backend, api} from './Backend'
import * as convert from './convert'
import * as defaults from './defaults'
import type {APIUser} from 'discord-api-types/v9'
import type {ClientOptions} from 'discord.js'
import type {EmitPacket, HasIntents} from './Backend'
import type {ClientData, ResolvedClientData} from './types'

const _mockClient = (
  backend: Backend,
  client: D.Client,
  {application: app}: ClientData = {}
): void => {
  const data = backend['resolvedData']

  // Stop the RESTManager from setting an interval
  client.options.restSweepInterval = 0

  const application = defaults.clientDataApplication(app)
  const user: APIUser = {
    ...(data.users.get(application.id) ??
      data.integration_applications.get(application.id)?.bot ??
      defaults.user()),
    bot: true
  }
  data.users.set(user.id, user)
  if (data.integration_applications.has(application.id))
    data.integration_applications.get(application.id)!.bot = user
  else {
    data.integration_applications.set(
      application.id,
      defaults.integrationApplication({id: application.id, bot: user})
    )
  }

  const hasIntents: HasIntents = intents =>
    // Intents are always resolved
    // https://github.com/discordjs/discord.js/blob/0e40f9b86826ba50aa3840807fb86e1bce6b1c3d/src/client/Client.js#L463
    !!((client.options.intents as number) & intents)
  const emitPacket: EmitPacket = (t, d) => {
    client.ws['handlePacket'](
      {op: GatewayOpcodes.Dispatch, t, d},
      client.ws.shards.first()
    )
  }
  const clientData: ResolvedClientData = {application}
  // Initialise the mocked API. This needs to be done with
  // Object.defineProperty because api is originally a getter
  Object.defineProperty(client, 'api', {
    value: api(backend, clientData, hasIntents, emitPacket),
    configurable: true
  })

  // Initialise the client user and application
  client.user = new D.ClientUser(client, user)
  client.application = new D.ClientApplication(client, application)

  // Create a shard
  const shard = new WebSocketShard(client.ws, 0)
  client.ws.shards.set(0, shard)

  // Make the websocket manager ready to receive packets
  client.ws['triggerClientReady']()

  if (hasIntents(GatewayIntentBits.Guilds) && data.guilds.size) {
    // Make each of the guilds available
    const convertGuild = convert.guildCreateGuild(data, clientData)
    for (const [, guild] of data.guilds) {
      if (guild.members.some(({id}) => id === user.id))
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
  clearInterval(client.sweepMessageInterval)

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
