export type Config = {
  animationSpeedMs: number
  clientApiUrl: string
  credentials: {
    token?: {
      access_token: string
    }
    clientId: string
    clientSecret: string
    oAuthUrl?: string
    resourceId: string
    tenantId: string
  }
  excludeLines: string[]
  highlightLines: string[]
  icons: {
    STRASSENBAHN: string
    STADTBUS: string
  }
  maxResults: number
  stationId: string
  showLineColors: boolean
  showPlatform: boolean
  showTableHeadersAsSymbols: boolean
  timeformat: string
  updateIntervalMs: number
}
