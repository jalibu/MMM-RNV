interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

declare module 'logger' {
  const Log: Logger
  export = Log
}
