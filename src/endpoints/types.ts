import type stream from 'stream'

export interface File {
  file: Buffer | stream.Readable
  name: string
}
