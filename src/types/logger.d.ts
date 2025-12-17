declare module 'logger' {
  interface Logger {
    log: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error?: (...args: unknown[]) => void
  }

  const Log: Logger
  export default Log
  export type { Logger }
}
