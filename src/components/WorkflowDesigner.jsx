import { useState } from 'react'
import { NODE_TYPES } from '../utils/constants'

const NODE_STYLES = {
  [NODE_TYPES.START]: {
    bg: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
    border: '#389e0d',
    shape: 'rounded-full',
  },
  [NODE_TYPES.APPROVAL]: {
    bg: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
    border: '#096dd9',
    shape: 'rounded-lg',
  },
  [NODE_TYPES.CONDITION]: {
    bg: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
    border: '#d48806',
    shape: 'rotate-45',
  },
  [NODE_TYPES.CC]: {
    bg: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
    border: '#531dab',
    shape: 'rounded-lg',
  },
  [NODE_TYPES.END]: {
    bg: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)',
    border: '#cf1322',
    shape: 'rounded-full',
  },
}

const NODE_ICONS = {
  [NODE_TYPES.START]: '▶️',
  [NODE_TYPES.APPROVAL]: '✅',
  [NODE_TYPES.CC]: '📧',
  [NODE_TYPES.END]: '⏹️',
}

export default function WorkflowDesigner({
  nodes,
  selectedId,
  onSelect,
  onAddNode,
  onRemoveNode,
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(null)

  const sortedNodes = [...nodes].sort((a, b) => a.y - b.y)

  const handleAddPointKeyDown = (e, i) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      setShowAddMenu(showAddMenu === i ? null : i)
    } else if (e.key === 'Escape') {
      setShowAddMenu(null)
    }
  }

  const handleNodeKeyDown = (e, node, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(node.id)
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      const prev = sortedNodes[index - 1]
      if (prev) onSelect(prev.id)
    } else if (e.key === 'ArrowDown' && index < sortedNodes.length - 1) {
      e.preventDefault()
      const next = sortedNodes[index + 1]
      if (next) onSelect(next.id)
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId === node.id) {
      if (node.type !== NODE_TYPES.START && node.type !== NODE_TYPES.END) {
        e.preventDefault()
        onRemoveNode(node.id)
      }
    } else if (e.key === 'Escape') {
      setShowAddMenu(null)
    }
  }

  return (
    <section
      className="workflow-designer"
      role="region"
      aria-label={`流程设计区域，共 ${nodes.length} 个节点`}
      aria-describedby="wf-a11y-hint"
    >
      <span id="wf-a11y-hint" className="visually-hidden">
        使用 Tab 键在节点之间切换，Enter 键选中节点，方向键在节点之间移动焦点，Delete 删除选中节点（开始/结束节点不可删）
      </span>

      <header className="workflow-header">
        <div className="workflow-title">
          <span className="title-icon" aria-hidden="true">🔄</span>
          <div>
            <h2>审批流程设计</h2>
            <p>共 {nodes.length} 个节点，流程将按顺序执行</p>
          </div>
        </div>
        <div
          className="workflow-legend"
          role="list"
          aria-label="节点类型图例"
        >
          <span className="legend-item" role="listitem">
            <i className="dot start" aria-hidden="true"></i>
            <span>开始</span>
          </span>
          <span className="legend-item" role="listitem">
            <i className="dot approval" aria-hidden="true"></i>
            <span>审批</span>
          </span>
          <span className="legend-item" role="listitem">
            <i className="dot cc" aria-hidden="true"></i>
            <span>抄送</span>
          </span>
          <span className="legend-item" role="listitem">
            <i className="dot end" aria-hidden="true"></i>
            <span>结束</span>
          </span>
        </div>
      </header>

      <div
        className="workflow-canvas"
        role="application"
        aria-label="流程图画布，包含节点与连接线"
      >
        <div className="canvas-bg" aria-hidden="true">
          <div className="grid-pattern"></div>
        </div>

        <svg
          className="connector-svg"
          style={{ width: '100%', height: '100%' }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
            </marker>
            <marker
              id="arrowhead-hover"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#52c41a" />
            </marker>
          </defs>

          {sortedNodes.slice(0, -1).map((node, i) => {
            const nextNode = sortedNodes[i + 1]
            const x1 = node.x + 90
            const y1 = node.y + 70
            const x2 = nextNode.x + 90
            const y2 = nextNode.y
            const isHovered = hoveredId === node.id || hoveredId === nextNode.id

            return (
              <g key={`line-${node.id}`} aria-hidden="true">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHovered ? '#52c41a' : '#d9d9d9'}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeDasharray={isHovered ? '0' : '5,5'}
                  markerEnd={`url(#arrowhead${isHovered ? '-hover' : ''})`}
                  style={{ transition: 'all 0.3s ease' }}
                />
                <circle
                  cx={x1}
                  cy={(y1 + y2) / 2}
                  r="12"
                  fill="#fff"
                  stroke="#1890ff"
                  strokeWidth="2"
                  className="add-point"
                  style={{ cursor: 'pointer', opacity: isHovered || showAddMenu === i ? 1 : 0 }}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAddMenu(showAddMenu === i ? null : i)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`在 ${node.name} 之后插入新节点`}
                  aria-haspopup="dialog"
                  aria-expanded={showAddMenu === i}
                  onKeyDown={(e) => handleAddPointKeyDown(e, i)}
                  onFocus={() => setHoveredId(node.id)}
                  onBlur={() => setHoveredId(null)}
                >
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                </circle>
                <text
                  x={x1}
                  y={(y1 + y2) / 2 + 4}
                  textAnchor="middle"
                  fill="#1890ff"
                  fontSize="14"
                  fontWeight="bold"
                  className="add-text"
                  style={{ pointerEvents: 'none', opacity: isHovered ? 1 : 0 }}
                  aria-hidden="true"
                >
                  +
                </text>
              </g>
            )
          })}
        </svg>

        {showAddMenu !== null && (
          <div
            className="add-node-menu"
            role="dialog"
            aria-modal="true"
            aria-label="插入节点选择"
            aria-describedby="insert-menu-header"
            style={{
              left: 420,
              top: (sortedNodes[showAddMenu].y + sortedNodes[showAddMenu + 1].y) / 2 - 60,
            }}
          >
            <div className="menu-arrow" aria-hidden="true"></div>
            <div className="menu-header" id="insert-menu-header">
              选择要插入的节点类型
            </div>
            <div
              className="menu-items"
              role="list"
              aria-label="可选节点类型"
            >
              <button
                type="button"
                role="listitem"
                onClick={() => {
                  onAddNode(NODE_TYPES.APPROVAL, sortedNodes[showAddMenu].id)
                  setShowAddMenu(null)
                }}
                aria-label="插入审批节点"
              >
                <span className="mi-icon approval" aria-hidden="true">✅</span>
                <span className="mi-label">审批节点</span>
              </button>
              <button
                type="button"
                role="listitem"
                onClick={() => {
                  onAddNode(NODE_TYPES.CC, sortedNodes[showAddMenu].id)
                  setShowAddMenu(null)
                }}
                aria-label="插入抄送节点"
              >
                <span className="mi-icon cc" aria-hidden="true">📧</span>
                <span className="mi-label">抄送节点</span>
              </button>
              <button
                type="button"
                role="listitem"
                onClick={() => {
                  onAddNode(NODE_TYPES.CONDITION, sortedNodes[showAddMenu].id)
                  setShowAddMenu(null)
                }}
                aria-label="插入条件分支节点"
              >
                <span className="mi-icon condition" aria-hidden="true">🔀</span>
                <span className="mi-label">条件分支</span>
              </button>
            </div>
            <button
              type="button"
              className="menu-close"
              onClick={() => setShowAddMenu(null)}
              aria-label="关闭节点插入菜单"
            >
              ×
            </button>
          </div>
        )}

        <ul
          className="workflow-node-list visually-hidden"
          aria-label="流程节点顺序表"
        >
          {sortedNodes.map((node) => (
            <li key={node.id}>
              {node.name}（{getTypeName(node.type)}）
              {node.approver ? `，处理人：${node.approver}` : ''}
            </li>
          ))}
        </ul>

        {sortedNodes.map((node, index) => {
          const isSelected = selectedId === node.id
          const typeName = getTypeName(node.type)
          const canRemove = node.type !== NODE_TYPES.START && node.type !== NODE_TYPES.END

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`第 ${index + 1} 个节点：${typeName}节点「${node.name}」${node.approver ? `，处理人${node.approver}` : ''}${canRemove ? '，可删除' : '（系统节点不可删除）'}`}
              aria-pressed={isSelected}
              aria-posinset={index + 1}
              aria-setsize={sortedNodes.length}
              className={`workflow-node ${isSelected ? 'selected' : ''} ${hoveredId === node.id ? 'hovered' : ''} type-${node.type}`}
              style={{
                left: node.x,
                top: node.y,
                background: NODE_STYLES[node.type]?.bg,
                borderColor: NODE_STYLES[node.type]?.border,
              }}
              onClick={() => onSelect(node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onKeyDown={(e) => handleNodeKeyDown(e, node, index)}
            >
              <div className="node-header">
                <span className="node-icon" aria-hidden="true">
                  {NODE_ICONS[node.type] || '📦'}
                </span>
                <span className="node-type-tag">{typeName}</span>
              </div>
              <div className="node-name">{node.name}</div>
              <div
                className="node-approver"
                aria-label={node.approver ? `处理人 ${node.approver}` : '未指定处理人'}
              >
                <span className="approver-icon" aria-hidden="true">👤</span>
                <span className="approver-name">{node.approver}</span>
              </div>

              {canRemove && (
                <div
                  className="node-toolbar"
                  role="group"
                  aria-label={`${node.name} 节点操作`}
                >
                  <button
                    type="button"
                    className="nt-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveNode(node.id)
                    }}
                    title="删除节点（选中后按 Delete 键）"
                    aria-label={`删除${typeName}节点 ${node.name}`}
                  >
                    🗑️
                  </button>
                </div>
              )}

              {isSelected && (
                <div className="selection-ring" aria-hidden="true"></div>
              )}
            </div>
          )
        })}
      </div>

      <div
        className="workflow-summary"
        role="group"
        aria-label="流程统计信息"
      >
        <div className="summary-item">
          <span className="si-icon" aria-hidden="true">📊</span>
          <div>
            <span
              className="si-value"
              aria-label={`审批节点数量 ${nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length}`}
            >
              {nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length}
            </span>
            <span className="si-label">审批节点</span>
          </div>
        </div>
        <div className="summary-item">
          <span className="si-icon" aria-hidden="true">📧</span>
          <div>
            <span
              className="si-value"
              aria-label={`抄送节点数量 ${nodes.filter(n => n.type === NODE_TYPES.CC).length}`}
            >
              {nodes.filter(n => n.type === NODE_TYPES.CC).length}
            </span>
            <span className="si-label">抄送节点</span>
          </div>
        </div>
        <div className="summary-item">
          <span className="si-icon" aria-hidden="true">⏱️</span>
          <div>
            <span
              className="si-value"
              aria-label={`预估时长约 ${(nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length * 0.5).toFixed(1)} 天`}
            >
              ≈{(nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length * 0.5).toFixed(1)}天
            </span>
            <span className="si-label">预估时长</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function getTypeName(type) {
  const map = {
    [NODE_TYPES.START]: '开始',
    [NODE_TYPES.APPROVAL]: '审批',
    [NODE_TYPES.CONDITION]: '条件',
    [NODE_TYPES.CC]: '抄送',
    [NODE_TYPES.END]: '结束',
  }
  return map[type] || '节点'
}
