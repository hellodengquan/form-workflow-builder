import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkflowDesigner from '../components/WorkflowDesigner'

const makeNodes = () => [
  { id: 'n1', type: 'start', name: '开始', x: 330, y: 40 },
  { id: 'n2', type: 'approval', name: '部门主管审批', approver: '李主管', x: 330, y: 160 },
  { id: 'n3', type: 'end', name: '结束', x: 330, y: 280 },
]

describe('WorkflowDesigner', () => {
  const onSelect = vi.fn()
  const onUpdate = vi.fn()
  const onAddNode = vi.fn()
  const onRemoveNode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染起始、审批、结束节点', () => {
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const nodeNames = Array.from(container.querySelectorAll('.workflow-node .node-name')).map(el => el.textContent)
    expect(nodeNames).toContain('开始')
    expect(nodeNames).toContain('部门主管审批')
    expect(nodeNames).toContain('结束')
  })

  it('渲染所有节点数量与 SVG 连接线', () => {
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const nodeEls = container.querySelectorAll('.workflow-node')
    expect(nodeEls.length).toBe(3)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    const lines = svg.querySelectorAll('line, path')
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it('点击节点触发 onSelect', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const approvalNode = Array.from(container.querySelectorAll('.workflow-node'))
      .find(n => n.querySelector('.node-name')?.textContent === '部门主管审批')
    await user.click(approvalNode)
    expect(onSelect).toHaveBeenCalledWith('n2')
  })

  it('选中节点时显示 selected 高亮类', () => {
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId="n2"
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const selected = container.querySelectorAll('.workflow-node.selected')
    expect(selected.length).toBe(1)
    expect(selected[0].querySelector('.node-name').textContent).toBe('部门主管审批')
  })

  it('插入菜单按钮存在（开始节点后）', () => {
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const insertBtns = container.querySelectorAll('circle.add-point')
    expect(insertBtns.length).toBeGreaterThan(0)
  })

  it('点击插入菜单显示选项，并选择审批节点触发 onAddNode', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const insertBtn = container.querySelectorAll('circle.add-point')[0]
    await user.click(insertBtn)

    const popup = container.querySelector('.add-node-menu')
    expect(popup).toBeInTheDocument()

    const approvalOpt = within(popup).getByText('审批节点')
    await user.click(approvalOpt)

    expect(onAddNode).toHaveBeenCalledWith(
      expect.anything(),
      'n1'
    )
  })

  it('删除审批节点按钮触发 onRemoveNode', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId="n2"
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const approvalNode = Array.from(container.querySelectorAll('.workflow-node'))
      .find(n => n.querySelector('.node-name')?.textContent === '部门主管审批')
    const delBtn = within(approvalNode).getByRole('button', { name: /删除.*节点/ })
    await user.click(delBtn)
    expect(onRemoveNode).toHaveBeenCalledWith('n2')
  })

  it('开始节点和结束节点不显示删除按钮', () => {
    const { container } = render(
      <WorkflowDesigner
        nodes={makeNodes()}
        selectedId="n1"
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const workflowNodes = container.querySelectorAll('.workflow-node')
    const startNode = Array.from(workflowNodes)
      .find(n => n.querySelector('.node-name')?.textContent === '开始')
    const endNode = Array.from(workflowNodes)
      .find(n => n.querySelector('.node-name')?.textContent === '结束')

    expect(within(startNode).queryByTitle('删除节点')).not.toBeInTheDocument()
    expect(within(endNode).queryByTitle('删除节点')).not.toBeInTheDocument()
  })

  it('多种节点类型正确渲染对应图标和类型名', () => {
    const nodes = [
      { id: 'n1', type: 'start', name: '开始', x: 330, y: 40 },
      { id: 'n2', type: 'approval', name: '审批', approver: '李', x: 330, y: 160 },
      { id: 'n3', type: 'condition', name: '金额条件', expression: 'amount>1000', x: 330, y: 280 },
      { id: 'n4', type: 'cc', name: '抄送HR', x: 330, y: 400 },
      { id: 'n5', type: 'end', name: '结束', x: 330, y: 520 },
    ]
    const { container } = render(
      <WorkflowDesigner
        nodes={nodes}
        selectedId={null}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
      />
    )
    const typeTags = Array.from(container.querySelectorAll('.workflow-node .node-type-tag'))
      .map(t => t.textContent)
    expect(typeTags).toContain('条件')
    expect(typeTags).toContain('抄送')

    const nodeNames = Array.from(container.querySelectorAll('.workflow-node .node-name'))
      .map(n => n.textContent)
    expect(nodeNames).toContain('金额条件')
    expect(nodeNames).toContain('抄送HR')
  })
})
