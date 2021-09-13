import { Config } from '../types/Config'
import { Color } from '../types/Departure'

export default class RNVUtils {
  config: Config

  constructor(config: Config) {
    this.config = config
  }

  getTypeIcon(type: string): string {
    return this.config.icons[type] || 'fas fa-bus'
  }

  getLineColorStyle(color: Color): string {
    if(!color || !this.config.showLineColors)
      return ''
    return `background: ${color.primary.hex}; color: ${color.contrast.hex}; padding: 5px;`
  }
}
