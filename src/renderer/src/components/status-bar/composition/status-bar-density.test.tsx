// @vitest-environment happy-dom
import { act, render } from '@testing-library/react'
import { useCallback, useRef } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { STATUS_BAR_DENSITY_LEVELS, useStatusBarDensity } from './status-bar-density'

const AVAILABLE = 300
// Segment widths per density level: every level overflows until level 3 may collapse chips.
const SEGMENTS = [200, 180, 160, 140, 120]

const widths = new WeakMap<Element, () => number>()

beforeEach(() => {
  // Why a no-op: these cases must settle without resize notifications.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return new DOMRect(0, 0, widths.get(this)?.() ?? 0, 0)
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.hasAttribute('data-bar') ? AVAILABLE : 0
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Chips `a` (100px) and `b`; `skew` widens the row whenever a chip is collapsed. */
function Bar({ chipB, skew }: { chipB: number; skew: number }): React.JSX.Element {
  const { density, collapsedUsageProviders, barRef, usageRef, segmentsRef } = useStatusBarDensity()
  const level = STATUS_BAR_DENSITY_LEVELS.indexOf(density)
  const chips = { a: 100, b: chipB }
  const shown = Object.entries(chips).filter(([chip]) => !collapsedUsageProviders.includes(chip))
  const rowWidth = shown.reduce((sum, [, width]) => sum + width, 0) + (shown.length < 2 ? skew : 0)
  const rowWidthRef = useRef(rowWidth)
  rowWidthRef.current = rowWidth
  // Why stable: like the real bar, the usage row is attached once, so its observers keep their records.
  const attachUsage = useCallback(
    (node: HTMLElement | null) => {
      usageRef(node)
      if (node) {
        widths.set(node, () => rowWidthRef.current)
      }
    },
    [usageRef]
  )
  const measured = (width: number) => (node: HTMLElement | null) => {
    if (node) {
      widths.set(node, () => width)
    }
  }
  return (
    <div ref={barRef} data-bar="" data-level={level} style={{ padding: '0px', columnGap: '0px' }}>
      <div ref={attachUsage}>
        <span style={{ columnGap: '0px' }}>
          {Object.entries(chips).map(([chip, width]) => (
            <span
              key={chip}
              ref={measured(width)}
              data-usage-chip={chip}
              data-usage-percentage="false"
              data-usage-collapsed={!collapsedUsageProviders.includes(chip) ? 'false' : 'true'}
            >
              {width}
            </span>
          ))}
        </span>
      </div>
      <div
        ref={(node) => {
          segmentsRef(node)
          measured(SEGMENTS[level])(node)
        }}
      />
    </div>
  )
}

const collapsedB = (container: HTMLElement) =>
  container.querySelector('[data-usage-chip="b"]')!.getAttribute('data-usage-collapsed')

it('settles on a collapsing level when collapsing a chip shifts the measured row width', () => {
  const { container } = render(<Bar chipB={100} skew={10} />)
  expect(container.querySelector('[data-bar]')!.getAttribute('data-level')).toBe('3')
  expect(collapsedB(container)).toBe('true')
})

it('brings a collapsed chip back when its text shrinks enough to fit', async () => {
  const { container, rerender } = render(<Bar chipB={100} skew={0} />)
  expect(collapsedB(container)).toBe('true')
  // A collapsed chip is out of the row's flow, so only a content mutation reports its new width.
  await act(async () => {
    rerender(<Bar chipB={50} skew={0} />)
  })
  expect(collapsedB(container)).toBe('false')
})
