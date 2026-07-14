import type { Departure } from '../types/Departure'

export interface ApiDeparture {
  line: { id: string }
  type: string
  stops: {
    pole: { platform: { label: string } }
    destinationLabel: string
    plannedDeparture: { isoString: string | null }
    realtimeDeparture: { isoString: string | null }
  }[]
}

interface DepartureMapperOptions {
  excludeLines: string[]
  excludePlatforms: string[]
  highlightLines: string[]
  maxResults: number
  colorCodesMap: Map<string, Departure['color']>
  warn: (message: string) => void
}

/**
 * Maps API journeys to module departure entries with sorting, filtering and delay calculation.
 * @param apiDepartures Journeys returned from the RNV API.
 * @param options Mapper options for filtering, highlighting and warning behavior.
 * @param options.excludeLines Line ids to exclude from output.
 * @param options.excludePlatforms Platform labels to exclude from output.
 * @param options.highlightLines Line ids that should be marked as highlighted.
 * @param options.maxResults Maximum number of mapped departures.
 * @param options.colorCodesMap Map of line ids to color definitions.
 * @param options.warn Warning callback used when delay cannot be calculated.
 * @returns Mapped departure entries for frontend rendering.
 */
export function mapApiDepartures(
  apiDepartures: ApiDeparture[],
  { excludeLines, excludePlatforms, highlightLines, maxResults, colorCodesMap, warn }: DepartureMapperOptions
): Departure[] {
  const departures: Departure[] = []

  const filteredDepartures = apiDepartures.filter((journey) => journey.stops[0].plannedDeparture.isoString !== null)
  filteredDepartures.sort((a, b) => {
    const depA = a.stops[0].plannedDeparture.isoString
    const depB = b.stops[0].plannedDeparture.isoString

    if (!depA || !depB) return 0
    return depA < depB ? -1 : depA > depB ? 1 : 0
  })

  for (const apiDeparture of filteredDepartures) {
    const stop = apiDeparture.stops?.[0]
    if (!stop?.plannedDeparture?.isoString) {
      continue
    }

    const plannedDepartureDate = new Date(stop.plannedDeparture.isoString)

    let delayInMinutes = 0
    const realtimeIso = stop.realtimeDeparture?.isoString
    if (realtimeIso) {
      const realtimeDepartureDate = new Date(realtimeIso)
      const realtimeDepartureMs = realtimeDepartureDate.getTime()

      if (Number.isNaN(realtimeDepartureMs)) {
        warn(`Error calculating the delay: Invalid realtime departure '${realtimeIso}'`)
      } else {
        const delayInMs = realtimeDepartureMs - plannedDepartureDate.getTime()
        delayInMinutes = Math.round(delayInMs / (60 * 1000))
      }
    }

    const line = apiDeparture.line.id.split('-')[1]
    if (excludeLines.includes(line) || excludePlatforms.includes(stop.pole.platform.label)) {
      continue
    }

    departures.push({
      line,
      destination: stop.destinationLabel,
      departure: plannedDepartureDate.getTime(),
      delayInMin: delayInMinutes,
      platform: stop.pole.platform.label,
      type: apiDeparture.type,
      highlighted: highlightLines.includes(line),
      color: colorCodesMap.get(line)
    })

    if (departures.length === maxResults) {
      break
    }
  }

  return departures
}
