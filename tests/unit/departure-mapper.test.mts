import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mapApiDepartures } from '../../src/backend/DepartureMapper.ts'

const createApiDeparture = ({
  line = 'line-1',
  planned = '2026-01-01T12:00:00.000Z',
  realtime = '2026-01-01T12:03:00.000Z',
  platform = 'A',
  destination = 'Main Station',
  type = 'STRASSENBAHN'
} = {}) => ({
  line: { id: line },
  type,
  stops: [
    {
      pole: { platform: { label: platform } },
      destinationLabel: destination,
      plannedDeparture: { isoString: planned },
      realtimeDeparture: { isoString: realtime }
    }
  ]
})

const defaultOptions = {
  excludeLines: [],
  excludePlatforms: [],
  highlightLines: [],
  maxResults: 10,
  colorCodesMap: new Map(),
  warn: (message: string) => {
    void message
  }
}

describe('mapApiDepartures', () => {
  it('sorts departures by planned departure time ascending', () => {
    const mapped = mapApiDepartures(
      [
        createApiDeparture({ line: 'line-2', planned: '2026-01-01T12:30:00.000Z' }),
        createApiDeparture({ line: 'line-1', planned: '2026-01-01T12:10:00.000Z' })
      ],
      defaultOptions
    )

    assert.equal(mapped[0].line, '1')
    assert.equal(mapped[1].line, '2')
  })

  it('filters excluded lines and platforms', () => {
    const mapped = mapApiDepartures(
      [
        createApiDeparture({ line: 'line-1', platform: 'A' }),
        createApiDeparture({ line: 'line-2', platform: 'B' }),
        createApiDeparture({ line: 'line-3', platform: 'C' })
      ],
      {
        ...defaultOptions,
        excludeLines: ['2'],
        excludePlatforms: ['C']
      }
    )

    assert.equal(mapped.length, 1)
    assert.equal(mapped[0].line, '1')
  })

  it('calculates delay in minutes and supports early departures', () => {
    const delayed = mapApiDepartures(
      [
        createApiDeparture({
          planned: '2026-01-01T12:00:00.000Z',
          realtime: '2026-01-01T12:07:00.000Z'
        })
      ],
      defaultOptions
    )
    const early = mapApiDepartures(
      [
        createApiDeparture({
          planned: '2026-01-01T12:00:00.000Z',
          realtime: '2026-01-01T11:56:00.000Z'
        })
      ],
      defaultOptions
    )

    assert.equal(delayed[0].delayInMin, 7)
    assert.equal(early[0].delayInMin, -4)
  })

  it('defaults delay to 0 and emits warning when realtime departure is missing', () => {
    let warningMessage = ''
    const mapped = mapApiDepartures([createApiDeparture({ realtime: null })], {
      ...defaultOptions,
      warn: (message: string) => {
        warningMessage = message
      }
    })

    assert.equal(mapped[0].delayInMin, 0)
    assert.match(warningMessage, /Error calculating the delay:/)
  })

  it('respects maxResults', () => {
    const mapped = mapApiDepartures(
      [
        createApiDeparture({ line: 'line-1' }),
        createApiDeparture({ line: 'line-2' }),
        createApiDeparture({ line: 'line-3' })
      ],
      {
        ...defaultOptions,
        maxResults: 2
      }
    )

    assert.equal(mapped.length, 2)
  })
})
