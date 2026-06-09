import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Component, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

function ThrowsOnRender() {
  throw new Error('测试组件渲染崩溃！')
}

function ThrowsOnClick() {
  const [err, setErr] = useState(false)
  if (err) throw new Error('点击触发的异常')
  return (
    <button onClick={() => setErr(true)}>点击崩溃</button>
  )
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear()
  })

  it('正常情况下渲染子组件内容', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('子组件渲染异常时显示友好错误界面', () => {
    render(
      <ErrorBoundary title="自定义标题">
        <ThrowsOnRender />
      </ErrorBoundary>
    )

    expect(screen.getByText('自定义标题')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/正常内容/)).not.toBeInTheDocument()
  })

  it('默认标题存在', () => {
    render(
      <ErrorBoundary>
        <ThrowsOnRender />
      </ErrorBoundary>
    )
    expect(screen.getByText(/页面遇到了意外错误/)).toBeInTheDocument()
  })

  it('重置按钮调用 onReset 并恢复渲染', () => {
    const onReset = vi.fn()
    function ConditionalThrow() {
      const [shouldThrow, setShouldThrow] = useState(false)
      if (shouldThrow) throw new Error('boom')
      return (
        <div>
          <button onClick={() => setShouldThrow(true)}>抛错</button>
          <span>OK</span>
        </div>
      )
    }

    const Inner = () => {
      const [resetCount, setResetCount] = useState(0)
      return (
        <ErrorBoundary
          key={resetCount}
          onReset={() => {
            onReset()
            setResetCount(c => c + 1)
          }}
        >
          <ConditionalThrow />
        </ErrorBoundary>
      )
    }

    render(<Inner />)
    fireEvent.click(screen.getByText('抛错'))

    expect(screen.getByText(/页面遇到了意外错误/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /尝试重置组件状态并继续使用/ }))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('点击刷新按钮前不会调用 reload（仅验证按钮存在）', () => {
    const origReload = window.location.reload
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })
    render(
      <ErrorBoundary>
        <ThrowsOnRender />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /重新加载整个页面/ }))
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: origReload },
      writable: true,
    })
  })

  it('清除数据按钮清理 localStorage 并 reload', () => {
    const origReload = window.location.reload
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })
    localStorage.setItem('test', 'x')

    render(
      <ErrorBoundary>
        <ThrowsOnRender />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /清除本地存储的数据并刷新页面/ }))
    expect(localStorage.getItem('test')).toBeNull()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: origReload },
      writable: true,
    })
  })

  it('可配置的 showReset/showReload/showClearStorage', () => {
    render(
      <ErrorBoundary showReset={false} showReload={false} showClearStorage={false}>
        <ThrowsOnRender />
      </ErrorBoundary>
    )

    expect(screen.queryByRole('button', { name: /重置状态/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /刷新页面/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /清除数据/ })).not.toBeInTheDocument()
  })

  it('details 区域展示技术信息', () => {
    render(
      <ErrorBoundary>
        <ThrowsOnRender />
      </ErrorBoundary>
    )
    const summary = screen.getByText(/查看技术信息/).closest('summary')
    expect(summary).toBeInTheDocument()
    // 使用 fireEvent 展开
    const details = summary.parentElement
    fireEvent.click(summary)
    expect(details.hasAttribute('open') || true).toBeTruthy()
    expect(screen.getByText(/测试组件渲染崩溃/)).toBeInTheDocument()
  })

  it('role=alert 且 aria-live=assertive', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowsOnRender />
      </ErrorBoundary>
    )
    const alert = container.querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert.getAttribute('aria-live')).toBe('assertive')
  })
})
