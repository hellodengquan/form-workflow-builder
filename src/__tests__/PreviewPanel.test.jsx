import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from '../components/PreviewPanel'

const formFields = [
  { id: 'f1', type: 'text', label: '申请人', required: true, placeholder: '请输入姓名' },
  { id: 'f2', type: 'number', label: '金额', required: true, min: 100 },
  { id: 'f3', type: 'date', label: '申请日期', required: false },
  { id: 'f4', type: 'select', label: '类型', required: false, options: ['差旅', '采购'] },
  { id: 'f5', type: 'textarea', label: '说明', required: false },
]

const workflowNodes = [
  { id: 'n1', type: 'start', name: '开始', x: 330, y: 40 },
  { id: 'n2', type: 'approval', name: '主管审批', approver: '李主管', x: 330, y: 160 },
  { id: 'n3', type: 'condition', name: '金额>10000', expression: '金额>10000', x: 330, y: 280 },
  { id: 'n4', type: 'approval', name: '总监审批', approver: '王总监', x: 330, y: 400 },
  { id: 'n5', type: 'cc', name: '抄送HR', x: 330, y: 520 },
  { id: 'n6', type: 'end', name: '结束', x: 330, y: 640 },
]

describe('PreviewPanel', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('三种模式按钮都存在', () => {
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )
    expect(screen.getByText(/表单填写/)).toBeInTheDocument()
    expect(screen.getByText(/审批流转/)).toBeInTheDocument()
    expect(screen.getByText(/审批轨迹/)).toBeInTheDocument()
  })

  it('初始选中"表单填写"模式并渲染表单字段', () => {
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )
    const fillBtn = screen.getByText(/表单填写/).closest('button')
    expect(fillBtn.classList.contains('active')).toBe(true)

    expect(screen.getByText('申请人')).toBeInTheDocument()
    expect(screen.getByText('金额')).toBeInTheDocument()
    expect(screen.getByText('申请日期')).toBeInTheDocument()
    expect(screen.getByText('类型')).toBeInTheDocument()
    expect(screen.getByText('说明')).toBeInTheDocument()
  })

  it('模式切换：点击"审批流转"渲染流程节点', async () => {
    const user = userEvent.setup()
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )

    await user.click(screen.getByText(/审批流转/))

    expect(screen.getByText('主管审批')).toBeInTheDocument()
    expect(screen.getByText('总监审批')).toBeInTheDocument()
    expect(screen.getByText('抄送HR')).toBeInTheDocument()
  })

  it('模式切换：点击"审批轨迹"渲染时间线', async () => {
    const user = userEvent.setup()
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )

    await user.click(screen.getByText(/审批轨迹/))

    expect(screen.getByText('审批完成')).toBeInTheDocument()
    const tlItems = screen.queryAllByText('主管审批')
    expect(tlItems.length).toBeGreaterThan(0)
  })

  it('三种模式可以循环切换，当前模式有 active 类', async () => {
    const user = userEvent.setup()
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )

    const fillTab = screen.getByText(/表单填写/).closest('button')
    const flowTab = screen.getByText(/审批流转/).closest('button')
    const tlTab = screen.getByText(/审批轨迹/).closest('button')

    await user.click(flowTab)
    expect(flowTab.classList.contains('active')).toBe(true)

    await user.click(tlTab)
    expect(tlTab.classList.contains('active')).toBe(true)

    await user.click(fillTab)
    expect(fillTab.classList.contains('active')).toBe(true)
  })

  it('提交前必填字段未填时：不进入审批流转，停留表单页面显示错误', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )
    const submitBtn = screen.getByText(/提交申请/).closest('button')
    await user.click(submitBtn)

    const flowTab = screen.getByText(/审批流转/).closest('button')
    expect(flowTab.classList.contains('active')).toBe(false)
    const fillTab = screen.getByText(/表单填写/).closest('button')
    expect(fillTab.classList.contains('active')).toBe(true)
    const errorTips = container.querySelectorAll('.pf-error-tip')
    expect(errorTips.length).toBeGreaterThan(0)
  })

  it('填写必填项后提交成功切到审批流转', async () => {
    const user = userEvent.setup()
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )

    const nameInput = screen.getByText('申请人').closest('.pf-field').querySelector('input')
    await user.type(nameInput, '张三')

    const amountInput = screen.getByText('金额').closest('.pf-field').querySelector('input')
    await user.type(amountInput, '200')

    const submitBtn = screen.getByText(/提交申请/).closest('button')
    await user.click(submitBtn)

    const flowTab = screen.getByText(/审批流转/).closest('button')
    expect(flowTab.classList.contains('active')).toBe(true)
  })

  it('关闭按钮调用 onClose 回调', async () => {
    const user = userEvent.setup()
    render(
      <PreviewPanel
        formFields={formFields}
        workflowNodes={workflowNodes}
        onClose={onClose}
      />
    )
    const closeBtn = screen.getByTitle(/关闭/)
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
