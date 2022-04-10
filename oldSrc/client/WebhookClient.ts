import Discord from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {Webhook} from '../structures'
import type {ClientOptions} from 'discord.js'

export class WebhookClient extends Webhook.applyToClass(Discord.WebhookClient) {
  readonly name: string
  readonly avatar: string | null

  constructor(
    id: string,
    token: string,
    options?: ClientOptions,
    data?: Webhook | Partial<Pick<Data.Webhook, 'id' | 'name' | 'avatar'>>
  ) {
    super(id, token, options)
    this.id = data?.id ?? defaults.webhook.id
    this.name = data?.name ?? defaults.webhook.name ?? ''
    this.avatar = data?.avatar ?? defaults.webhook.avatar
  }
}
