export interface Departure {
  line: string
  destination: string
  departure: number
  delayInMin: number
  platform: string
  type: string
  highlighted?: boolean
  color?: Color
}

export interface Color {
  id: string
  primary: {
    hex: string
  }
  secondary: {
    hex: string
  }
  contrast: {
    hex: string
  }
}
