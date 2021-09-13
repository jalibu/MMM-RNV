export type Departure = {
  line: string
  destination: string
  departure: number
  delayInMin: number
  platform: string
  type: string
  color?: Color
}

export type Color = {
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
