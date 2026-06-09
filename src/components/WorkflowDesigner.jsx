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

  return (
    <div className="workflow-designer">
      <div className="workflow-header">
        <div className="workflow-title">
          <span className="title-icon">🔄</span>
          <div>
            <h2>审批流程设计</h2>
            <p>共 {nodes.length} 个节点，流程将按顺序执行</p>
          </div>
        </div>
        <div className="workflow-legend">
          <span className="legend-item"><i className="dot start"></i>开始</span>
          <span className="legend-item"><i className="dot approval"></i>审批</span>
          <span className="legend-item"><i className="dot cc"></i>抄送</span>
          <span className="legend-item"><i className="dot end"></i>结束</span>
        </div>
      </div>

      <div className="workflow-canvas">
        <div className="canvas-bg">
          <div className="grid-pattern"></div>
        </div>

        <svg className="connector-svg" style={{ width: '100%', height: '100%' }}>
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
              <g key={`line-${node.id}`}>
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
            style={{
              left: 420,
              top: (sortedNodes[showAddMenu].y + sortedNodes[showAddMenu + 1].y) / 2 - 60,
            }}
          >
            <div className="menu-arrow"></div>
            <div className="menu-header">选择节点类型</div>
            <div className="menu-items">
              <button onClick={() => {
                onAddNode(NODE_TYPES.APPROVAL, sortedNodes[showAddMenu].id)
                setShowAddMenu(null)
              }}>
                <span className="mi-icon approval">✅</span>
                <span className="mi-label">审批节点</span>
              </button>
              <button onClick={() => {
                onAddNode(NODE_TYPES.CC, sortedNodes[showAddMenu].id)
                setShowAddMenu(null)
              }}>
                <span className="mi-icon cc">📧</span>
                <span className="mi-label">抄送节点</span>
              </button>
              <button onClick={() => {
                onAddNode(NODE_TYPES.CONDITION, sortedNodes[showAddMenu].id)
                setShowAddMenu(null)
              }}>
                <span className="mi-icon condition">🔀</span>
                <span className="mi-label">条件分支</span>
              </button>
            </div>
            <button className="menu-close" onClick={() => setShowAddMenu(null)}>×</button>
          </div>
        )}

        {sortedNodes.map((node) => (
          <div
            key={node.id}
            className={`workflow-node ${selectedId === node.id ? 'selected' : ''} ${hoveredId === node.id ? 'hovered' : ''} type-${node.type}`}
            style={{
              left: node.x,
              top: node.y,
              background: NODE_STYLES[node.type]?.bg,
              borderColor: NODE_STYLES[node.type]?.border,
            }}
            onClick={() => onSelect(node.id)}
            onMouseEnter={() => setHoveredId(node.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="node-header">
              <span className="node-icon">{NODE_ICONS[node.type] || '📦'}</span>
              <span className="node-type-tag">{getTypeName(node.type)}</span>
            </div>
            <div className="node-name">{node.name}</div>
            <div className="node-approver">
              <span className="approver-icon">👤</span>
              <span className="approver-name">{node.approver}</span>
            </div>

            {node.type !== NODE_TYPES.START && node.type !== NODE_TYPES.END && (
              <div className="node-toolbar">
                <button
                  className="nt-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveNode(node.id)
                  }}
                  title="删除节点"
                >
                  🗑️
                </button>
              </div>
            )}

            {selectedId === node.id && (
              <div className="selection-ring"></div>
            )}
          </div>
        ))}
      </div>

      <div className="workflow-summary">
        <div className="summary-item">
          <span className="si-icon">📊</span>
          <div>
            <span className="si-value">{nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length}</span>
            <span className="si-label">审批节点</span>
          </div>
        </div>
        <div className="summary-item">
          <span className="si-icon">📧</span>
          <div>
            <span className="si-value">{nodes.filter(n => n.type === NODE_TYPES.CC).length}</span>
            <span className="si-label">抄送节点</span>
          </div>
        </div>
        <div className="summary-item">
          <span className="si-icon">⏱️</span>
          <div>
            <span className="si-value">≈{(nodes.filter(n => n.type === NODE_TYPES.APPROVAL).length * 0.5).toFixed(1)}天</span>
            <span className="si-label">预估时长</span>
          </div>
        </div>
      </div>
    </div>
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
