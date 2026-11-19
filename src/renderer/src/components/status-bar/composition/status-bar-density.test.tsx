// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { STATUS_BAR_DENSITY_LEVELS, useStatusBarDensity } from './status-bar-density'

const AVAILABLE = 300
const CHIP = 100
// Segment widths per density level: every level overflows until level 3 may collapse chips.
const SEGMENTS = [200, 180, 160, 140, 120]
// A collapsed chip leaves the row 10px wider than its measured width accounts for.
const COLLAPSE_SKEW = 10

const widths = new WeakMap<Element, () => number>()

beforeEach(() => {
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

function Bar(): React.JSX.Element {
  const { density, collapsedUsageProviders, barRef, usageRef, segmentsRef } = useStatusBarDensity()
  const level = STATUS_BAR_DENSITY_LEVELS.indexOf(density)
  const shown = ['a', 'b'].filter((chip) => !collapsedUsageProviders.includes(chip))
  const measured = (width: number) => (node: HTMLElement | null) => {
    if (node) {
      widths.set(node, () => width)
    }
  }
  return (
    <div ref={barRef} data-bar="" data-level={level} style={{ padding: '0px', columnGap: '0px' }}>
      <div
        ref={(node) => {
          usageRef(node)
          measured(shown.length * CHIP + (shown.length < 2 ? COLLAPSE_SKEW : 0))(node)
        }}
      >
        <span style={{ columnGap: '0px' }}>
          {['a', 'b'].map((chip) => (
            <span
              key={chip}
              ref={measured(CHIP)}
              data-usage-chip={chip}
              data-usage-percentage="false"
              data-usage-collapsed={!shown.includes(chip)}
            />
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

it('settles on a collapsing level when collapsing a chip shifts the measured row width', () => {
  const { container } = render(<Bar />)
  const bar = container.querySelector('[data-bar]')!
  expect(bar.getAttribute('data-level')).toBe('3')
  expect(
    container.querySelector('[data-usage-chip="b"]')!.getAttribute('data-usage-collapsed')
  ).toBe('true')
})
