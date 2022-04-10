/** https://discord.com/developers/docs/topics/opcodes-and-status-codes#json */
export interface APIError {
  code: number
  message: string
  errors?: Record<string, unknown>
}
