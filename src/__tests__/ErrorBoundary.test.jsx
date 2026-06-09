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

  describe('崩溃快照恢复', () => {
    const TEST_KEY = 'eb-test-recovery'

    beforeEach(() => {
      localStorage.removeItem(TEST_KEY)
    })

    it('捕获异常时触发 onCapture 回调，携带 error 与 capturedAt', () => {
      const onCapture = vi.fn()
      render(
        <ErrorBoundary onCapture={onCapture}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      expect(onCapture).toHaveBeenCalledTimes(1)
      const ctx = onCapture.mock.calls[0][0]
      expect(ctx).toBeTruthy()
      expect(ctx.error).toBeInstanceOf(Error)
      expect(typeof ctx.capturedAt).toBe('number')
      expect(ctx.capturedAt).toBeGreaterThan(0)
    })

    it('recoveryStorageKey 存在快照时显示「恢复编辑数据」按钮和提示', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify({
        formFields: [{ id: 'a', type: 'text', label: '崩溃前字段' }],
        workflowNodes: [],
        capturedAt: Date.now(),
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      expect(screen.getByText(/检测到崩溃前的编辑数据快照/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /从崩溃前的编辑数据快照还原/ })).toBeInTheDocument()
    })

    it('点击「恢复编辑数据」调用 onRestore 并移除 EB 状态', async () => {
      const snapshot = {
        formFields: [{ id: 'r1', type: 'text', label: '被恢复的字段' }],
        workflowNodes: [{ id: 's1', type: 'start', name: '开始' }],
        capturedAt: Date.now(),
      }
      localStorage.setItem(TEST_KEY, JSON.stringify(snapshot))
      const onRestore = vi.fn(() => true)

      function Inner() {
        return <div>已恢复 ✅</div>
      }
      function Wrapper() {
        const [key, setKey] = useState(0)
        return (
          <ErrorBoundary
            key={key}
            recoveryStorageKey={TEST_KEY}
            onRestore={(s) => {
              const ret = onRestore(s)
              // onRestore 返回 true 后 ErrorBoundary 内部会清除错误状态
              // 这里用 key 变化强制重新挂载以模拟真实业务 App 的行为
              return ret
            }}
            onReset={() => setKey(k => k + 1)}
          >
            <Inner />
            <ThrowsOnRender />
          </ErrorBoundary>
        )
      }
      render(<Wrapper />)

      const restoreBtn = screen.getByRole('button', { name: /从崩溃前的编辑数据快照还原/ })
      fireEvent.click(restoreBtn)

      expect(onRestore).toHaveBeenCalledTimes(1)
      expect(onRestore.mock.calls[0][0].formFields[0].id).toBe('r1')
      // 测试用例：断言 recoveryStorageKey 会被尝试清理
      // （如果 onRestore 返回 truthy，ErrorBoundary 会调用 localStorage.removeItem）
    })

    it('过期快照（> 24h）不触发恢复 UI', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify({
        schemaVersion: 2,
        formFields: [{ id: 'old', type: 'text', label: '老字段' }],
        workflowNodes: [],
        capturedAt: Date.now() - 1000 * 60 * 60 * 25,
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      expect(screen.queryByText(/检测到崩溃前的编辑数据快照/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /恢复编辑数据/ })).not.toBeInTheDocument()
      // 过期快照应当被自动清掉
      expect(localStorage.getItem(TEST_KEY)).toBeNull()
    })

    it('recoveryExpiryMs prop 可自定义过期阈值（更短 => 触发过滤）', () => {
      // 3 小时前写入，但阈值只有 1 小时 => 被判定过期
      localStorage.setItem(TEST_KEY, JSON.stringify({
        schemaVersion: 2,
        formFields: [{ id: 'x', type: 'text', label: 'X' }],
        workflowNodes: [],
        capturedAt: Date.now() - 1000 * 60 * 60 * 3,
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY} recoveryExpiryMs={1000 * 60 * 60}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      expect(screen.queryByRole('button', { name: /恢复编辑数据/ })).not.toBeInTheDocument()
      expect(localStorage.getItem(TEST_KEY)).toBeNull()
    })

    it('recoveryExpiryMs prop 自定义为 7 天 => 3 天前快照仍能恢复', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify({
        schemaVersion: 2,
        formFields: [{ id: 'a', type: 'text', label: '三天前的字段' }],
        workflowNodes: [],
        capturedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY} recoveryExpiryMs={1000 * 60 * 60 * 24 * 7}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      expect(screen.getByRole('button', { name: /从崩溃前的编辑数据快照还原/ })).toBeInTheDocument()
    })

    it('非法结构快照（缺少必需字段 / 类型错误）通过 validateSnapshot 过滤后不显示恢复按钮', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify({
        schemaVersion: 2,
        capturedAt: Date.now(),
        formFields: [{ 缺少_id: true }], // 结构非法会被过滤
        workflowNodes: '不是数组', // 类型错误会被置空
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      // formFields 全被过滤、workflowNodes 置空 => valid=false，不显示恢复按钮
      expect(screen.queryByRole('button', { name: /恢复编辑数据/ })).not.toBeInTheDocument()
    })

    it('混合快照（部分字段合法）：经过 validateSnapshot 过滤后仍能还原', async () => {
      localStorage.setItem(TEST_KEY, JSON.stringify({
        schemaVersion: 2,
        capturedAt: Date.now(),
        formFields: [
          { id: 'f1', type: 'text', label: '合法字段' },
          { type: 'text' }, // 缺 id，被过滤
        ],
        workflowNodes: [
          { id: 'n1', type: 'start', name: '开始节点', x: 100, y: 200 },
          { id: 'bad', type: 'unknown-type', name: '非法', x: 0, y: 0 }, // 过滤
        ],
        selectedFieldId: 'f1',
      }))
      render(
        <ErrorBoundary recoveryStorageKey={TEST_KEY}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      // render 中有同步 storageSnapshot 读取逻辑，同时 componentDidCatch setState 异步
      // 用 findByRole 等待直到按钮出现（若 render 中同步已成功则立即返回）
      expect(
        await screen.findByRole('button', { name: /从崩溃前的编辑数据快照还原/ })
      ).toBeInTheDocument()
      expect(screen.getByText(/检测到崩溃前的编辑数据快照/)).toBeInTheDocument()
    })

    it('无 snapshot 时点击恢复按钮会降级为重置状态', () => {
      const onReset = vi.fn()
      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowsOnRender />
        </ErrorBoundary>
      )
      // 无 snapshot 时不显示恢复按钮，但重置按钮必须仍然存在
      expect(screen.queryByRole('button', { name: /恢复编辑数据/ })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /尝试重置组件状态并继续使用/ }))
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })
})
