import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, STORAGE_KEYS, clearAllStorage } from '../hooks/useLocalStorage'

describe('useLocalStorage hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('初始化时从 localStorage 读取数据', () => {
    const testData = [{ id: 'x', type: 'text', label: '测试' }]
    localStorage.setItem(STORAGE_KEYS.FORM_FIELDS, JSON.stringify(testData))

    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEYS.FORM_FIELDS, [])
    )

    expect(result.current[0]).toEqual(testData)
  })

  it('localStorage 为空时使用初始值', () => {
    const defaultValue = [{ id: 'default' }]
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEYS.FORM_FIELDS, defaultValue)
    )

    expect(result.current[0]).toEqual(defaultValue)
  })

  it('setter 更新后自动写入 localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEYS.FORM_FIELDS, [])
    )

    const newData = [{ id: 'new', type: 'textarea' }]
    act(() => {
      result.current[1](newData)
    })

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.FORM_FIELDS))).toEqual(newData)
  })

  it('支持函数作为初始值', () => {
    const initFn = vi.fn(() => [{ id: 'fn-init' }])
    renderHook(() => useLocalStorage('key-x', initFn))
    expect(initFn).toHaveBeenCalledTimes(1)
  })

  it('localStorage 损坏数据时回退到初始值', () => {
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_NODES, '{invalid json')
    const defaultValue = [{ id: 'fallback' }]
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEYS.WORKFLOW_NODES, defaultValue)
    )
    expect(result.current[0]).toEqual(defaultValue)
  })

  it('clearAllStorage 清理所有存储键', () => {
    localStorage.setItem(STORAGE_KEYS.FORM_FIELDS, JSON.stringify([1]))
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_NODES, JSON.stringify([2]))

    clearAllStorage()

    expect(localStorage.getItem(STORAGE_KEYS.FORM_FIELDS)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.WORKFLOW_NODES)).toBeNull()
  })
})
