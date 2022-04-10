import Discord, {Constants, DataResolver, Util, Permissions, SnowflakeUtil} from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {Guild} from '../../structures/Guild'
import {apiError, mergeDefault, timestamp} from '../../util'
import manager from '../BaseManager'
import type {
  Base64Resolvable, BufferResolvable, Collection, DefaultMessageNotifications, ExplicitContentFilterLevel,
  GuildResolvable, PartialChannelData, PartialRoleData, Snowflake, VerificationLevel
} from 'discord.js'
import type {Client} from '../../client'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ChannelTypes, ExplicitContentFilterLevels, VerificationLevels} = Constants

export class GuildManager extends manager<Discord.GuildManager, typeof Guild, GuildResolvable>(
  Discord.GuildManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, Guild>
  // cacheType!: typeof Collection
  holds!: typeof Guild
  declare add: (data?: Partial<Data.Guild>, cache?: boolean, {id, extras}?: {id: Snowflake, extras?: any[]}) => Guild
  resolve!: (resolvable: GuildResolvable) => Guild | null

  constructor(client: Client, iterable?: Iterable<Data.Guild>) {
    super(client, iterable, Guild)
  }

  /**
   * Creates a guild.
   * This is only available to bots in fewer than 10 guilds.
   *
   * @param name The name of the guild.
   * @param options Options for the creating.
   * @param options.channels The channels for this guild.
   * @param options.defaultMessageNotifications The default message notifications for the guild.
   * @param options.explicitContentFilter The explicit content filter level for the guild.
   * @param options.icon The icon for the guild.
   * @param options.region The region for the server; defaults to the closest one available.
   * @param options.roles The roles for this guild; the first element of this array is used to change properties of the
   * guild's everyone role.
   * @param options.verificationLevel The verification level for the guild.
   * @returns The guild that was created.
   */
  async create(
    name: string,
    {
      channels = [],
      defaultMessageNotifications,
      explicitContentFilter,
      icon = null,
      region,
      roles = [],
      verificationLevel
    }: {
      region?: string
      icon?: BufferResolvable | Base64Resolvable | null
      channels?: PartialChannelData[]
      defaultMessageNotifications?: DefaultMessageNotifications
      explicitContentFilter?: ExplicitContentFilterLevel
      roles?: PartialRoleData[]
      verificationLevel?: VerificationLevel
    } = {}
  ): Promise<Guild> {
    if (this.cache.size >= 10) apiError('MAX_GUILDS', 'guilds', 'post')

    // eslint-disable-next-line require-atomic-updates -- icon won't be reassigned based on outdated value of icon
    icon = await (DataResolver.resolveImage as
      (resource: BufferResolvable | Base64Resolvable | null) => Promise<string | null>)(icon)

    return new Promise(resolve => {
      const categoryChannels = new Map<number, string>()
      const data = mergeDefault(defaults.guild, {
        name,
        icon: icon as string | null,
        owner: true,
        owner_id: this.client.user.id,
        region,
        verification_level: typeof verificationLevel == 'undefined' || typeof verificationLevel == 'number'
          ? verificationLevel
          : VerificationLevels.indexOf(verificationLevel),
        default_message_notifications: typeof defaultMessageNotifications == 'undefined' ||
        typeof defaultMessageNotifications == 'number'
          ? defaultMessageNotifications
          : Constants.DefaultMessageNotifications.indexOf(defaultMessageNotifications),
        explicit_content_filter: typeof explicitContentFilter == 'undefined' || typeof explicitContentFilter == 'number'
          ? explicitContentFilter
          : ExplicitContentFilterLevels.indexOf(explicitContentFilter),
        roles: roles.map(role => mergeDefault(defaults.role, {
          ...role,
          id: undefined,
          color: role.color === undefined ? 0 : Util.resolveColor(role.color),
          permissions: Permissions.resolve(role.permissions)
        })),
        joined_at: timestamp(),
        member_count: 1,
        members: [mergeDefault(defaults.guildMember, {user: this.client.user.toData()})],
        channels: channels.map(({id, name: _name, topic, type, parentID, permissionOverwrites}) => {
          const _id = SnowflakeUtil.generate()
          if (type === ChannelTypes.CATEGORY && id !== undefined) categoryChannels.set(id, _id)
          return mergeDefault(
            defaults[
              /* eslint-disable operator-linebreak -- ternary looks clearer */
              type === ChannelTypes.VOICE ? 'voiceChannel' :
              /* eslint-disable @typescript-eslint/no-unnecessary-condition -- TS thinks that type is undefined from here
              onwards */
              type === ChannelTypes.CATEGORY ? 'categoryChannel' :
              type === ChannelTypes.NEWS ? 'newsChannel' :
              type === ChannelTypes.STORE ? 'storeChannel' :
              /* eslint-enable @typescript-eslint/no-unnecessary-condition -- see above */
              /* eslint-enable operator-linebreak -- see above */
              'textChannel'
            ],
            {
              id: _id,
              name: _name.replace(/ +/ug, '-'),
              topic: topic ?? (type === ChannelTypes.TEXT ? null : undefined),
              parent_id: parentID === undefined ? null : categoryChannels.get(parentID),
              permission_overwrites: permissionOverwrites?.map(overwrite => ({
                ...overwrite, allow: Permissions.resolve(overwrite.allow), deny: Permissions.resolve(overwrite.deny)
              }))
            }
          ) as Data.GuildChannel
        })
      })

      const handleGuild = (guild: Guild): void => {
        if (guild.id === data.id) {
          this.client.removeListener(Constants.Events.GUILD_CREATE, handleGuild)
          // eslint-disable-next-line no-use-before-define -- impossible to do this without using timeout before it's defined
          this.client.clearTimeout(timeout)
          resolve(guild)
        }
      }
      this.client.on(Constants.Events.GUILD_CREATE, handleGuild)

      const timeout = this.client.setTimeout(() => {
        this.client.removeListener(Constants.Events.GUILD_CREATE, handleGuild)
        resolve(this.client.guilds.add(data))
      }, 10_000)

      this.client.ws._handlePacket({
        t: 'GUILD_CREATE',
        d: data
      }, this.client.ws.shards.first())
    })
  }
}
