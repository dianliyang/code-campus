import { expect, test, describe } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

const SimpleComponent = () => <div>Hello World</div>

describe('Unit Tests', () => {
  test('math works', () => {
    expect(1 + 1).toBe(2)
  })

  test('renders component', () => {
    render(<SimpleComponent />)
    expect(screen.getByText('Hello World')).toBeDefined()
  })
})
