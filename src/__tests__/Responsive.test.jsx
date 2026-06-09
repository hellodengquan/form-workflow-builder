import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import App from '../App'
import { STORAGE_KEYS } from '../hooks/useLocalStorage'

// 清理 useLocalStorage 的缓存键并注入视口尺寸模拟
function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

describe('响应式断点与移动端抽屉', () => {
  beforeEach(() => {
    localStorage.clear()
    // 给表单默认存一些字段，方便测试"选中项指示点"等场景
    localStorage.setItem(
      STORAGE_KEYS.FORM_FIELDS,
      JSON.stringify([
        { id: 'f1', type: 'text', label: '申请标题', required: true },
        { id: 'f2', type: 'number', label: '金额', unit: '元' },
      ])
    )
    localStorage.setItem(
      STORAGE_KEYS.WORKFLOW_NODES,
      JSON.stringify([
        { id: 'start-1', type: 'start', name: '开始', x: 320, y: 40, approver: '申请人' },
        { id: 'end-1', type: 'end', name: '结束', x: 320, y: 160, approver: '系统' },
      ])
    )
    setViewportWidth(1920)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('宽屏（≥1024px）不渲染移动端 Tab Bar，侧边栏 inline 显示', () => {
    render(<App />)
    expect(screen.queryByRole('tablist', { name: /移动端面板切换/ })).not.toBeInTheDocument()
    // 左侧字段库区域原生可见
    expect(screen.getByRole('region', { name: /字段库面板/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /属性配置面板/ })).toBeInTheDocument()
    // app-container class
    const app = document.querySelector('.app-container')
    expect(app.classList.contains('viewport-wide')).toBe(true)
    expect(app.classList.contains('viewport-narrow')).toBe(false)
  })

  it('窄屏（≤1023px）渲染移动端 Tab Bar，主内容区仍存在', () => {
    render(<App />)
    setViewportWidth(768)

    const tablist = screen.getByRole('tablist', { name: /移动端面板切换/ })
    expect(tablist).toBeInTheDocument()

    // 三栏 Tab：左 / 中 / 右
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs).toHaveLength(2) // 左边+右边，中间不是 tab 而是 group
    expect(tabs[0].getAttribute('aria-label')).toMatch(/打开.*(字段库|节点库)/)
    expect(tabs[1].getAttribute('aria-label')).toMatch(/打开属性配置面板/)

    // class 切换
    expect(document.querySelector('.app-container').classList.contains('viewport-narrow')).toBe(true)
  })

  it('点击左侧 Tab 打开字段库抽屉，再次点击关闭', () => {
    render(<App />)
    setViewportWidth(800)

    const leftTab = screen.getByRole('tab', { name: /打开(字段库|节点库)/ })
    expect(leftTab.getAttribute('aria-selected')).toBe('false')

    fireEvent.click(leftTab)
    expect(leftTab.getAttribute('aria-selected')).toBe('true')
    const leftPanel = document.querySelector('.left-panel')
    expect(leftPanel.classList.contains('drawer-open')).toBe(true)

    fireEvent.click(leftTab)
    expect(leftTab.getAttribute('aria-selected')).toBe('false')
    expect(leftPanel.classList.contains('drawer-open')).toBe(false)
  })

  it('点击右侧 Tab 打开属性抽屉，关闭按钮（×）可关闭', () => {
    render(<App />)
    setViewportWidth(800)

    const rightTab = screen.getByRole('tab', { name: /打开属性配置面板/ })
    fireEvent.click(rightTab)
    expect(rightTab.getAttribute('aria-selected')).toBe('true')
    expect(document.querySelector('.right-panel.drawer-open')).toBeInTheDocument()

    const closeBtn = within(document.querySelector('.right-panel')).getByRole('button', {
      name: /关闭属性面板/,
    })
    fireEvent.click(closeBtn)
    expect(rightTab.getAttribute('aria-selected')).toBe('false')
  })

  it('点击遮罩层（drawer-backdrop）关闭任何抽屉', () => {
    render(<App />)
    setViewportWidth(800)
    fireEvent.click(screen.getByRole('tab', { name: /打开(字段库|节点库)/ }))
    expect(document.querySelector('.drawer-backdrop')).toBeInTheDocument()
    fireEvent.click(document.querySelector('.drawer-backdrop'))
    expect(document.querySelector('.drawer-backdrop')).not.toBeInTheDocument()
    expect(document.querySelector('.left-panel.drawer-open')).not.toBeInTheDocument()
  })

  it('切宽屏后自动关闭所有抽屉并移除 Tab Bar', () => {
    render(<App />)
    setViewportWidth(800)
    fireEvent.click(screen.getByRole('tab', { name: /打开(字段库|节点库)/ }))
    expect(document.querySelector('.left-panel.drawer-open')).toBeInTheDocument()

    setViewportWidth(1280)
    expect(screen.queryByRole('tablist', { name: /移动端面板切换/ })).not.toBeInTheDocument()
    expect(document.querySelector('.drawer-backdrop')).not.toBeInTheDocument()
  })

  it('超窄屏（≤640px）仍能渲染三栏 Tab 并切换', () => {
    render(<App />)
    setViewportWidth(390) // iPhone 12 竖屏宽度

    const tablist = screen.getByRole('tablist', { name: /移动端面板切换/ })
    expect(tablist).toBeInTheDocument()

    const rightTab = screen.getByRole('tab', { name: /打开属性配置面板/ })
    fireEvent.click(rightTab)
    expect(rightTab.getAttribute('aria-selected')).toBe('true')

    fireEvent.click(rightTab)
    expect(rightTab.getAttribute('aria-selected')).toBe('false')
  })

  it('中间 Tab 显示当前模式名称与计数（表单→流程）', () => {
    render(<App />)
    setViewportWidth(800)
    const center = document.querySelector('.mdtab-center')
    expect(center.textContent).toMatch(/表单设计/)
    expect(center.textContent).toMatch(/2字段/)

    // Toolbar 的"流程设计"按钮（非 role=tab，是普通按钮）
    const workflowBtn = document.querySelector('.tab-switcher .tab-btn')?.nextElementSibling
    expect(workflowBtn).toBeTruthy()
    expect(workflowBtn.textContent).toMatch(/流程设计/)
    fireEvent.click(workflowBtn)

    expect(center.textContent).toMatch(/流程设计/)
    expect(center.textContent).toMatch(/2节点/)
  })

  it('属性面板被选中字段时显示绿色小圆点提示', () => {
    const { container } = render(<App />)
    setViewportWidth(800)

    // 点击第一个字段让其选中
    const field = Array.from(container.querySelectorAll('.field-item')).find(
      el => el.textContent.includes('申请标题')
    )
    fireEvent.click(field)
    // 属性 Tab 带指示点
    const rightTab = screen.getByRole('tab', { name: /打开属性配置面板/ })
    expect(rightTab.querySelector('.mdtab-dot')).toBeInTheDocument()
  })

  describe('键盘快捷键', () => {
    it('Ctrl/Cmd+B 切换左侧抽屉', () => {
      render(<App />)
      setViewportWidth(800)

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.left-panel.drawer-open')).toBeInTheDocument()

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.left-panel.drawer-open')).not.toBeInTheDocument()
    })

    it('Ctrl/Cmd+P 切换右侧抽屉', () => {
      render(<App />)
      setViewportWidth(800)

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.right-panel.drawer-open')).toBeInTheDocument()

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'p', metaKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.right-panel.drawer-open')).not.toBeInTheDocument()
    })

    it('Esc 关闭当前打开的抽屉', () => {
      render(<App />)
      setViewportWidth(800)

      // 打开左侧
      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.left-panel.drawer-open')).toBeInTheDocument()

      // 按 Esc
      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        window.dispatchEvent(ev)
      })
      expect(document.querySelector('.left-panel.drawer-open')).not.toBeInTheDocument()
      expect(document.querySelector('.drawer-backdrop')).not.toBeInTheDocument()
    })

    it('宽屏下 Ctrl+B / Ctrl+P 不显示抽屉遮罩（Tab Bar 不出现）', () => {
      render(<App />)
      setViewportWidth(1440)

      // 宽屏不渲染移动端抽屉 Tab Bar
      expect(screen.queryByRole('tablist', { name: /移动端面板切换/ })).not.toBeInTheDocument()

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true })
        window.dispatchEvent(ev)
      })
      // 即使 state 变化，宽屏也不该渲染遮罩（遮罩只在 isNarrowViewport 时渲染）
      expect(document.querySelector('.drawer-backdrop')).not.toBeInTheDocument()
      // 宽屏 .viewport-narrow 标记也不能出现
      expect(document.querySelector('.app-container').classList.contains('viewport-narrow')).toBe(false)
    })
  })
})
