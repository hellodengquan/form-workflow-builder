import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormDesigner from '../components/FormDesigner'

const mockFields = [
  { id: 'f1', type: 'text', label: '姓名', required: true },
  { id: 'f2', type: 'number', label: '金额', required: false },
  { id: 'f3', type: 'date', label: '日期', required: true },
]

describe('FormDesigner', () => {
  const onSelect = vi.fn()
  const onUpdate = vi.fn()
  const onRemove = vi.fn()
  const onMove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染所有传入的字段', () => {
    const { container } = render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const labels = Array.from(container.querySelectorAll('.label-text')).map(el => el.textContent)
    expect(labels).toContain('姓名')
    expect(labels).toContain('金额')
    expect(labels).toContain('日期')
  })

  it('点击字段时触发 onSelect', async () => {
    const user = userEvent.setup()
    render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const nameItem = screen.getByText(/姓名/).closest('.field-item')
    await user.click(nameItem)
    expect(onSelect).toHaveBeenCalledWith('f1')
  })

  it('选中字段时显示 selected 样式', () => {
    const { container } = render(
      <FormDesigner
        fields={mockFields}
        selectedId="f2"
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const selectedItems = container.querySelectorAll('.field-item.selected')
    expect(selectedItems.length).toBe(1)
    expect(within(selectedItems[0]).getByText(/金额/)).toBeInTheDocument()
  })

  it('必填字段显示红色 * 标记', () => {
    render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )
    const requiredMarks = screen.getAllByText('*')
    expect(requiredMarks.length).toBe(2)
  })

  it('字段有校验错误时显示红色错误提示', () => {
    const errors = {
      f1: ['此字段为必填项'],
    }
    render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
        validationErrors={errors}
      />
    )
    expect(screen.getByText('此字段为必填项')).toBeInTheDocument()
    const errorField = screen.getByText(/姓名/).closest('.field-item')
    expect(errorField.classList.contains('has-error')).toBe(true)
  })

  it('点击删除按钮触发 onRemove', async () => {
    const user = userEvent.setup()
    render(
      <FormDesigner
        fields={mockFields}
        selectedId="f2"
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const fieldItem = screen.getByText('金额').closest('.field-item')
    const deleteBtn = within(fieldItem).getByRole('button', { name: /删除.*字段/ })
    await user.click(deleteBtn)
    expect(onRemove).toHaveBeenCalledWith('f2')
  })

  it('空字段列表显示空状态提示', () => {
    render(
      <FormDesigner
        fields={[]}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )
    expect(screen.getByText(/尚未添加任何字段/)).toBeInTheDocument()
    expect(screen.getByText(/字段库/)).toBeInTheDocument()
  })

  it('HTML5 drag and drop: 拖放后调用 onMove 重新排序', () => {
    const { container } = render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const items = container.querySelectorAll('.field-item')

    const mockDataTransfer = {
      effectAllowed: '',
      getData: () => '',
      setData: vi.fn(),
    }

    fireEvent.dragStart(items[0], { dataTransfer: mockDataTransfer })
    fireEvent.dragOver(items[2], { preventDefault: vi.fn() })
    fireEvent.drop(items[2], { preventDefault: vi.fn() })
    fireEvent.dragEnd(items[0])

    expect(onMove).toHaveBeenCalledWith(0, 2)
  })

  it('onMove 未调用时同位置拖放不触发', () => {
    const { container } = render(
      <FormDesigner
        fields={mockFields}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
      />
    )

    const items = container.querySelectorAll('.field-item')

    const mockDataTransfer = {
      effectAllowed: '',
      getData: () => '',
      setData: vi.fn(),
    }

    fireEvent.dragStart(items[1], { dataTransfer: mockDataTransfer })
    fireEvent.dragOver(items[1], { preventDefault: vi.fn() })
    fireEvent.drop(items[1], { preventDefault: vi.fn() })
    fireEvent.dragEnd(items[1])

    expect(onMove).not.toHaveBeenCalled()
  })
})
