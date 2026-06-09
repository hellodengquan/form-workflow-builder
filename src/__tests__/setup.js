import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

class LocalStorageMock {
  constructor() {
    this.store = {}
  }
  clear() { this.store = {} }
  getItem(key) { return this.store[key] || null }
  setItem(key, value) { this.store[key] = String(value) }
  removeItem(key) { delete this.store[key] }
  get length() { return Object.keys(this.store).length }
  key(i) { return Object.keys(this.store)[i] || null }
}

global.localStorage = new LocalStorageMock()

vi.stubGlobal('matchMedia', (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

window.scrollTo = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()
