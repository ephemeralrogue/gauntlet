export * from './audit-log.ts';
export * from './channel/index.ts';
export * from './emoji.ts';
export * from './gateway.ts';
export * from './guild/index.ts';
export * from './misc.ts';
export * from './oauth2.ts';
export * from './permissions.ts';
export * from './sticker.ts';
export * from './teams.ts';
export * from './template.ts';
export * from './user.ts';
export * from './voice.ts';
export * from './webhook.ts';

export function embed(arg0: { title: string | undefined; description: string | undefined; url: string | undefined; timestamp: string | undefined; color: number | undefined; footer: Omit<import("discord-api-types/v9").APIEmbedFooter, "proxy_icon_url"> | undefined; image: Pick<import("discord-api-types/v9").APIEmbedImage, "url"> | undefined; thumbnail: Pick<import("discord-api-types/v9").APIEmbedThumbnail, "url"> | undefined; author: Omit<import("discord-api-types/v9").APIEmbedAuthor, "proxy_icon_url"> | undefined; fields: import("discord-api-types/v9").APIEmbedField[] | undefined }): import("../types/index.ts").Embed {
	throw new Error('Function not implemented.')
}
export function message(channelId: string) {
	throw new Error('Function not implemented.')
}

export function attachment(channelId: string, id: any) {
	throw new Error('Function not implemented.')
}

