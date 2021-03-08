// TODO: add to DT
declare module 'discord-markdown' {
  import type markdown from 'simple-markdown'

  type DefaultRules = markdown.DefaultRules
  type Output = markdown.Output
  type ParserRule = markdown.ParserRule

  interface BaseNode {
    type: string
  }

  interface NodeWithChildren extends BaseNode {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
    content: ASTNode[]
  }

  export interface BreakNode extends BaseNode {
    type: 'br'
  }

  export interface TextNode extends BaseNode {
    type: 'text'
    content: string
  }

  export interface CodeBlockNode extends BaseNode {
    type: 'codeBlock'
    lang: string
    content: string
    inQuote: boolean
  }

  export interface InlineCodeNode extends BaseNode {
    type: 'inlineCode'
    content: string
  }

  export interface AutolinkNode extends BaseNode {
    type: 'autolink'
    content: [TextNode]
    target: string
  }

  export interface URLNode extends BaseNode {
    type: 'url'
    content: [TextNode]
    target: string
  }

  export interface BlockQuoteNode extends NodeWithChildren {
    type: 'blockQuote'
  }

  export interface EmphasisNode extends NodeWithChildren {
    type: 'em'
  }

  export interface SpoilerNode extends NodeWithChildren {
    type: 'spoiler'
  }

  export interface StrikeNode extends NodeWithChildren {
    type: 'strike'
  }

  export interface StrongNode extends NodeWithChildren {
    type: 'strong'
  }

  export interface UnderlineNode extends NodeWithChildren {
    type: 'u'
  }

  export interface DiscordEveryoneNode extends BaseNode {
    type: 'discordEveryone'
  }

  export interface DiscordHereNode extends BaseNode {
    type: 'discordHere'
  }

  interface NodeWithID extends BaseNode {
    id: string
  }

  export interface DiscordChannelNode extends NodeWithID {
    type: 'discordChannel'
  }

  export interface DiscordRoleNode extends NodeWithID {
    type: 'discordRole'
  }

  export interface DiscordUserNode extends NodeWithID {
    type: 'discordUser'
  }

  export interface DiscordEmojiNode extends NodeWithID {
    type: 'discordEmoji'
    animated: boolean
    name: string
  }

  export type DiscordASTNode =
    | DiscordChannelNode
    | DiscordEmojiNode
    | DiscordEveryoneNode
    | DiscordHereNode
    | DiscordRoleNode
    | DiscordUserNode

  export type StandardASTNode =
    | AutolinkNode
    | BlockQuoteNode
    | BreakNode
    | CodeBlockNode
    | EmphasisNode
    | InlineCodeNode
    | SpoilerNode
    | StrikeNode
    | StrongNode
    | TextNode
    | UnderlineNode
    | URLNode

  export type ASTNode = DiscordASTNode | StandardASTNode

  export interface DiscordCallback {
    user: (node: DiscordUserNode) => string
    channel: (node: DiscordChannelNode) => string
    role: (node: DiscordRoleNode) => string
    everyone: (node: DiscordEveryoneNode) => string
    here: (node: DiscordHereNode) => string
  }

  export interface ToHTMLOptions {
    /**
     * Parse as embed content
     * @default false
     */
    embed?: boolean

    /**
     * Escape HTML in the output
     * @default true
     */
    escapeHTML?: boolean

    /**
     * Only parse Discord-specific stuff (such as mentions)
     * @default false
     */
    discordOnly?: boolean

    /** Provide custom handling for mentions and emojis */
    discordCallback?: DiscordCallback

    /**
     * An object mapping css classes to css module classes
     * @default null
     */
    cssModuleNames?: Record<string, string> | null
  }

  type Rule<R extends ParserRule, N extends markdown.SingleASTNode> = Omit<
    R,
    'parse'
  > & {
    parse: (...args: Parameters<R['parse']>) => Omit<N, 'type'>
  }

  type DiscordMarkdownRule = markdown.NonNullHtmlOutputRule & ParserRule

  export interface DiscordRules {
    discordUser: Rule<DiscordMarkdownRule, DiscordUserNode>
    discordChannel: Rule<DiscordMarkdownRule, DiscordChannelNode>
    discordRole: Rule<DiscordMarkdownRule, DiscordRoleNode>
    discordEmoji: Rule<DiscordMarkdownRule, DiscordEmojiNode>
    discordEveryone: Rule<DiscordMarkdownRule, DiscordEveryoneNode>
    discordHere: Rule<DiscordMarkdownRule, DiscordHereNode>
    text: Rule<DefaultRules['text'], TextNode>
  }

  export interface Rules extends DiscordRules {
    blockQuote: Rule<DefaultRules['blockQuote'], BlockQuoteNode>
    codeBlock: Rule<DefaultRules['codeBlock'], CodeBlockNode>
    newline: DefaultRules['newline']
    escape: DefaultRules['escape']
    autolink: Rule<DefaultRules['autolink'], AutolinkNode>
    url: Rule<DefaultRules['url'], URLNode>
    em: Rule<DefaultRules['em'], EmphasisNode>
    strong: Rule<DefaultRules['strong'], StrongNode>
    u: Rule<DefaultRules['u'], UnderlineNode>
    strike: Rule<DefaultRules['del'], StrikeNode>
    inlineCode: Rule<DefaultRules['inlineCode'], InlineCodeNode>
    emoticon: Rule<DiscordMarkdownRule, TextNode>
    br: Rule<DefaultRules['br'], BreakNode>
    spoiler: Rule<DiscordMarkdownRule, SpoilerNode>
  }

  // This is NOT part of ASTNode because embed rule aren't included in parser
  export interface LinkNode extends NodeWithChildren {
    type: 'link'
    target: string
    title?: string
  }

  export interface EmbedRules extends Rules {
    link: Rule<DefaultRules['link'], LinkNode>
  }

  export let parser: (
    source: string,
    state?: markdown.OptionalState
  ) => ASTNode[]
  export let htmlOutput: Output<string>

  /**
   * Parse markdown and return the HTML output
   * @param source Source markdown content
   * @param options Options for the parser
   */
  export let toHTML: (
    source: string,
    options?: ToHTMLOptions,
    ...args:
      | [customParser: markdown.Parser, customHtmlOutput: Output<string>]
      | [customParser?: undefined, customHtmlOutput?: undefined]
  ) => string

  export let rules: Rules
  export let rulesDiscordOnly: DiscordRules
  export let rulesEmbed: EmbedRules
  export let markdownEngine: typeof markdown

  /**
   * @param [isClosed=true]
   * @param [state={}]
   */
  export let htmlTag: (
    tagName: string,
    content: string,
    attributes: Record<string, markdown.Attr>,
    isClosed?: boolean,
    state?: Pick<ToHTMLOptions, 'cssModuleNames'>
  ) => string
}
