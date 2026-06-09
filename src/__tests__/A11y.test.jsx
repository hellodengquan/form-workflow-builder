import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormDesigner from '../components/FormDesigner'
import WorkflowDesigner from '../components/WorkflowDesigner'
import PreviewPanel from '../components/PreviewPanel'
import PropertyPanel from '../components/PropertyPanel'
import FieldLibrary from '../components/FieldLibrary'

const mockFields = [
  { id: 'f1', type: 'text', label: '姓名', required: true },
  { id: 'f2', type: 'number', label: '金额', min: 0, max: 1000, required: false },
  { id: 'f3', type: 'date', label: '申请日期', required: true },
]

const makeNodes = () => [
  { id: 'n1', type: 'start', name: '开始', x: 330, y: 40 },
  { id: 'n2', type: 'approval', name: '主管审批', approver: '李主管', x: 330, y: 160 },
  { id: 'n3', type: 'end', name: '结束', x: 330, y: 280 },
]

const workflowNodes = [
  { id: 'n1', type: 'start', name: '开始', x: 330, y: 40 },
  { id: 'n2', type: 'approval', name: '主管审批', approver: '李主管', x: 330, y: 160 },
  { id: 'n3', type: 'condition', name: '金额>10000', expression: '金额>10000', x: 330, y: 280 },
  { id: 'n4', type: 'end', name: '结束', x: 330, y: 400 },
]

describe('无障碍 A11y 属性检查', () => {
  describe('FormDesigner', () => {
    it('主区域具有 role=region 与 aria-label', () => {
      render(
        <FormDesigner
          fields={mockFields}
          selectedId={null}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
        />
      )
      const region = screen.getByRole('region', { name: /表单设计区域/ })
      expect(region).toBeInTheDocument()
    })

    it('每个字段 role=listitem tabIndex=0 键盘可达', () => {
      const { container } = render(
        <FormDesigner
          fields={mockFields}
          selectedId={null}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
        />
      )
      const items = container.querySelectorAll('.field-item[tabindex="0"]')
      expect(items.length).toBe(mockFields.length)
      items.forEach(el => {
        expect(el.getAttribute('role')).toBe('listitem')
      })
    })

    it('字段错误时 aria-invalid=true', () => {
      const { container } = render(
        <FormDesigner
          fields={mockFields}
          selectedId={null}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          validationErrors={{ f1: ['必填'] }}
        />
      )
      const fieldEl = Array.from(container.querySelectorAll('.field-item'))
        .find(item => item.textContent.includes('姓名'))
      expect(fieldEl.getAttribute('aria-invalid')).toBe('true')
    })

    it('键盘操作 Alt+ArrowUp/Down 触发排序', () => {
      const onMove = vi.fn()
      const { container } = render(
        <FormDesigner
          fields={mockFields}
          selectedId={null}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onMove={onMove}
        />
      )
      const item = container.querySelectorAll('.field-item[tabindex]')[1]
      fireEvent.keyDown(item, { key: 'ArrowUp', altKey: true })
      expect(onMove).toHaveBeenCalledWith(1, 0)

      fireEvent.keyDown(item, { key: 'ArrowDown', altKey: true })
      expect(onMove).toHaveBeenCalledWith(1, 2)
    })

    it('键盘 Delete 删除选中字段', () => {
      const onRemove = vi.fn()
      const { container } = render(
        <FormDesigner
          fields={mockFields}
          selectedId="f2"
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={onRemove}
          onMove={vi.fn()}
        />
      )
      const item = container.querySelectorAll('.field-item[tabindex]')[1]
      fireEvent.keyDown(item, { key: 'Delete' })
      expect(onRemove).toHaveBeenCalledWith('f2')
    })
  })

  describe('WorkflowDesigner', () => {
    it('主区域 role=region 与 aria-label', () => {
      render(
        <WorkflowDesigner
          nodes={makeNodes()}
          selectedId={null}
          onSelect={vi.fn()}
          onAddNode={vi.fn()}
          onRemoveNode={vi.fn()}
        />
      )
      expect(screen.getByRole('region', { name: /流程设计区域/ })).toBeInTheDocument()
    })

    it('每个节点都是 role=button + tabIndex=0 键盘可达', () => {
      const { container } = render(
        <WorkflowDesigner
          nodes={makeNodes()}
          selectedId={null}
          onSelect={vi.fn()}
          onAddNode={vi.fn()}
          onRemoveNode={vi.fn()}
        />
      )
      const nodes = container.querySelectorAll('.workflow-node[role="button"][tabindex="0"]')
      expect(nodes.length).toBe(3)
    })

    it('节点之间箭头键切换选中', () => {
      const onSelect = vi.fn()
      const { container } = render(
        <WorkflowDesigner
          nodes={makeNodes()}
          selectedId={null}
          onSelect={onSelect}
          onAddNode={vi.fn()}
          onRemoveNode={vi.fn()}
        />
      )
      const mid = container.querySelectorAll('.workflow-node[role="button"]')[1]
      fireEvent.keyDown(mid, { key: 'ArrowUp' })
      expect(onSelect).toHaveBeenCalledWith('n1')
      fireEvent.keyDown(mid, { key: 'ArrowDown' })
      expect(onSelect).toHaveBeenCalledWith('n3')
    })

    it('添加节点按钮 role=button 且 tabIndex=0', () => {
      const { container } = render(
        <WorkflowDesigner
          nodes={makeNodes()}
          selectedId={null}
          onSelect={vi.fn()}
          onAddNode={vi.fn()}
          onRemoveNode={vi.fn()}
        />
      )
      const addPt = container.querySelectorAll('circle.add-point[role="button"][tabindex="0"]')
      expect(addPt.length).toBeGreaterThan(0)
    })

    it('节点添加菜单 role=dialog aria-modal=true', () => {
      const { container } = render(
        <WorkflowDesigner
          nodes={makeNodes()}
          selectedId={null}
          onSelect={vi.fn()}
          onAddNode={vi.fn()}
          onRemoveNode={vi.fn()}
        />
      )
      const addPt = container.querySelectorAll('circle.add-point')[0]
      fireEvent.click(addPt)
      const menu = container.querySelector('.add-node-menu')
      expect(menu.getAttribute('role')).toBe('dialog')
      expect(menu.getAttribute('aria-modal')).toBe('true')
    })
  })

  describe('PreviewPanel', () => {
    it('对话框 role=dialog aria-modal=true', () => {
      render(
        <PreviewPanel
          formFields={mockFields}
          workflowNodes={workflowNodes}
          onClose={vi.fn()}
        />
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      expect(dialog.getAttribute('aria-labelledby')).toMatch(/preview-title/)
    })

    it('三种模式 Tab 使用 role=tab + aria-selected', () => {
      render(
        <PreviewPanel
          formFields={mockFields}
          workflowNodes={workflowNodes}
          onClose={vi.fn()}
        />
      )
      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(3)
      // 第一个默认选中
      expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    })

    it('tab panel 使用 role=tabpanel aria-labelledby', () => {
      render(
        <PreviewPanel
          formFields={mockFields}
          workflowNodes={workflowNodes}
          onClose={vi.fn()}
        />
      )
      const panel = screen.getByRole('tabpanel', { name: undefined, hidden: true })
      expect(panel).toBeTruthy()
    })
  })

  describe('FieldLibrary', () => {
    it('字段卡片具有 role=button 与 aria-label，可键盘触发', () => {
      const onAdd = vi.fn()
      const { container } = render(<FieldLibrary onAddField={onAdd} />)
      const cards = container.querySelectorAll('.field-card')
      expect(cards.length).toBeGreaterThan(0)
      cards.forEach(el => {
        expect(el.getAttribute('role')).toBe('button')
        expect(el.getAttribute('tabindex')).toBe('0')
        expect(el.getAttribute('aria-label')).toBeTruthy()
      })
      // 键盘 Enter 触发添加
      fireEvent.keyDown(cards[0], { key: 'Enter' })
      expect(onAdd).toHaveBeenCalledTimes(1)
    })
  })
})
