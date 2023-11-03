// This is separate from guild/index.ts to avoid import cycles

import { snowflake } from '../../utils.ts';
import { DEFAULT_GUILD_NAME } from '../constants.ts';
import { createDefaults as d } from '../utils.ts';
import type {
  GuildWelcomeScreen,
  GuildWelcomeScreenChannel,
  PartialGuild
} from '../../types/index.ts';

const welcomeScreenChannel = d<GuildWelcomeScreenChannel>(_channel => ({
  channel_id: snowflake(),
  description: 'Follow for official Discord API updates',
  emoji_id: null,
  emoji_name: null,
  ..._channel
}))

const welcomeScreen = d<GuildWelcomeScreen>(screen => ({
  description: null,
  ...screen,
  welcome_channels: screen.welcome_channels?.map(welcomeScreenChannel) ?? []
}))

export const partialGuild = d<PartialGuild>(({ welcome_screen, ...rest }) => ({
  id: snowflake(),
  name: DEFAULT_GUILD_NAME,
  icon: null,
  splash: null,
  ...rest,
  ...(welcome_screen ? { welcome_screen: welcomeScreen(welcome_screen) } : {})
}))
