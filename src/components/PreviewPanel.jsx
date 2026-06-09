import { useState, useEffect, useMemo } from 'react'
import { NODE_TYPES, FIELD_TYPES } from '../utils/constants'
import { validateAllFields, validateField } from '../utils/validation'

export default function PreviewPanel({
  formFields,
  workflowNodes,
  onClose,
  validationErrors: externalErrors,
  onValidate,
  formData: externalFormData,
  setFormData: setExternalFormData,
}) {
  const hasExternalFormData = typeof externalFormData === 'object' && externalFormData !== null
  const [step, setStep] = useState(0)
  const [view, setView] = useState('form')
  const [internalFormData, setInternalFormData] = useState({})
  const [currentNodeIdx, setCurrentNodeIdx] = useState(0)
  const [comments, setComments] = useState({})
  const [localErrors, setLocalErrors] = useState({})

  const formData = hasExternalFormData ? externalFormData : internalFormData
  const setFormData = setExternalFormData || setInternalFormData

  const allErrors = useMemo(() => {
    const merged = { ...localErrors }
    if (externalErrors) {
      Object.entries(externalErrors).forEach(([k, v]) => {
        merged[k] = v
      })
    }
    return merged
  }, [localErrors, externalErrors])

  const sortedNodes = [...workflowNodes].sort((a, b) => a.y - b.y)
  const approvalNodes = sortedNodes.filter(n => n.type === NODE_TYPES.APPROVAL || n.type === NODE_TYPES.START)

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field.id]: value }))
    const fieldErrors = validateField(field, value)
    setLocalErrors(prev => ({ ...prev, [field.id]: fieldErrors }))
  }

  const nextNode = () => {
    setCurrentNodeIdx(Math.min(currentNodeIdx + 1, sortedNodes.length - 1))
  }

  const prevNode = () => {
    setCurrentNodeIdx(Math.max(currentNodeIdx - 1, 0))
  }

  const approve = () => {
    const node = sortedNodes[currentNodeIdx]
    setComments(prev => ({
      ...prev,
      [node.id]: [
        ...(prev[node.id] || []),
        { user: getApproverName(node), time: new Date().toLocaleString('zh-CN'), action: '同意', content: '同意该申请' }
      ]
    }))
    if (currentNodeIdx < sortedNodes.length - 1) nextNode()
  }

  const reject = () => {
    const node = sortedNodes[currentNodeIdx]
    setComments(prev => ({
      ...prev,
      [node.id]: [
        ...(prev[node.id] || []),
        { user: getApproverName(node), time: new Date().toLocaleString('zh-CN'), action: '驳回', content: '材料不完整，请补充' }
      ]
    }))
  }

  return (
    <div
      className="preview-mask"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        aria-describedby="preview-desc"
      >
        <div className="preview-header">
          <div className="pv-title">
            <span className="pvt-icon" aria-hidden="true">👁️</span>
            <div>
              <h2 id="preview-title">流程预览体验</h2>
              <p id="preview-desc">模拟真实审批场景，体验完整流程</p>
            </div>
          </div>

          <div
            className="pv-tabs"
            role="tablist"
            aria-label="预览模式选择"
          >
            <button
              type="button"
              role="tab"
              id="pv-tab-form"
              aria-selected={view === 'form'}
              aria-controls="pv-panel-form"
              tabIndex={view === 'form' ? 0 : -1}
              className={`pvt-btn ${view === 'form' ? 'active' : ''}`}
              onClick={() => setView('form')}
            >
              📝 表单填写
            </button>
            <button
              type="button"
              role="tab"
              id="pv-tab-workflow"
              aria-selected={view === 'workflow'}
              aria-controls="pv-panel-workflow"
              tabIndex={view === 'workflow' ? 0 : -1}
              className={`pvt-btn ${view === 'workflow' ? 'active' : ''}`}
              onClick={() => setView('workflow')}
            >
              🔄 审批流转
            </button>
            <button
              type="button"
              role="tab"
              id="pv-tab-timeline"
              aria-selected={view === 'timeline'}
              aria-controls="pv-panel-timeline"
              tabIndex={view === 'timeline' ? 0 : -1}
              className={`pvt-btn ${view === 'timeline' ? 'active' : ''}`}
              onClick={() => setView('timeline')}
            >
              📊 审批轨迹
            </button>
          </div>

          <button
            type="button"
            className="pv-close"
            onClick={onClose}
            title="关闭 (Esc)"
            aria-label="关闭预览窗口（按 Esc 键也可关闭）"
          >×</button>
        </div>

        <div className="preview-body">
          {view === 'form' && (
            <div
              className="preview-form"
              role="tabpanel"
              id="pv-panel-form"
              aria-labelledby="pv-tab-form"
              tabIndex={0}
            >
              <div className="pf-banner">
                <div className="pfb-left">
                  <span className="pfb-icon">📋</span>
                  <div>
                    <h3>请假申请表</h3>
                    <p>请填写以下信息提交审批</p>
                  </div>
                </div>
                <div className="pfb-meta">
                  <span>申请编号：QF{Date.now().toString().slice(-8)}</span>
                  <span>申请时间：{new Date().toLocaleString('zh-CN')}</span>
                </div>
              </div>

              <div className="pf-body">
                {formFields.length === 0 ? (
                  <div className="pf-empty">
                    <span className="pfe-icon">📝</span>
                    <p>暂无表单字段，请先添加</p>
                  </div>
                ) : (
                  formFields.map(field => (
                    <div key={field.id} className={`pf-field ${allErrors[field.id]?.length ? 'has-error' : ''}`}>
                      <div className="pff-label">
                        {field.label}
                        {field.required && <span className="req">*</span>}
                      </div>
                      <div className="pff-control">
                        {renderField(field, formData[field.id], (v) => handleFieldChange(field, v))}
                      </div>
                      {allErrors[field.id]?.length > 0 && (
                        <div className="pf-field-errors">
                          {allErrors[field.id].map((err, i) => (
                            <span key={i} className="pf-error-tip">
                              <span className="pf-error-icon">⚠️</span>
                              {err}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pf-footer">
                <div className="pff-info">
                  <span>将提交至：</span>
                  {approvalNodes.slice(0, 3).map((n, i) => (
                    <span key={n.id} className="flow-tag">
                      {i + 1}. {getApproverName(n)}
                    </span>
                  ))}
                  {approvalNodes.length > 3 && <span>等 {approvalNodes.length} 人</span>}
                </div>
                <div className="pff-actions">
                  <button className="btn btn-outline" onClick={onClose}>取消</button>
                  <button className="btn btn-primary" onClick={() => {
                    const result = validateAllFields(formFields, formData)
                    setLocalErrors(result.errors)
                    if (result.valid) {
                      setView('workflow')
                    } else if (onValidate) {
                      onValidate()
                    }
                  }}>
                    提交申请 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'workflow' && (
            <div
              className="preview-workflow"
              role="tabpanel"
              id="pv-panel-workflow"
              aria-labelledby="pv-tab-workflow"
              tabIndex={0}
            >
              <div
                className="pw-tracker"
                role="list"
                aria-label={`流程节点进度，共 ${sortedNodes.length} 个节点，当前第 ${currentNodeIdx + 1} 节点`}
              >
                {sortedNodes.map((node, i) => {
                  const isDone = i < currentNodeIdx
                  const isCurrent = i === currentNodeIdx
                  return (
                    <div
                      key={node.id}
                      role="listitem"
                      aria-label={`${getNodeTypeName(node.type)}节点：${node.name}，处理人 ${getApproverName(node)}，${isDone ? '已完成' : isCurrent ? '正在处理' : '待处理'}`}
                      aria-current={isCurrent || undefined}
                      className={`track-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div
                        className={`ts-dot ${node.type}`}
                        aria-hidden="true"
                      >
                        {isDone ? '✓' : getNodeIcon(node.type)}
                      </div>
                      <div className="ts-content">
                        <div className="ts-name">{node.name}</div>
                        <div className="ts-approver">{getApproverName(node)}</div>
                      </div>
                      {i < sortedNodes.length - 1 && (
                        <div
                          className={`ts-line ${isDone ? 'done' : ''}`}
                          role="presentation"
                        ></div>
                      )}
                    </div>
                  )
                })}
              </div>

              <article className="pw-panel" aria-label="当前节点详情">
                <header className="pwp-header">
                  <div className="pwph-node">
                    <span
                      className={`node-tag ${sortedNodes[currentNodeIdx].type}`}
                      aria-label={`节点类型：${getNodeTypeName(sortedNodes[currentNodeIdx].type)}`}
                    >
                      {getNodeTypeName(sortedNodes[currentNodeIdx].type)}
                    </span>
                    <h3>{sortedNodes[currentNodeIdx].name}</h3>
                  </div>
                  <div className="pwph-user" aria-label={`处理人：${getApproverName(sortedNodes[currentNodeIdx])}`}>
                    <div className="user-avatar" aria-hidden="true">
                      {getApproverName(sortedNodes[currentNodeIdx]).slice(0, 1)}
                    </div>
                    <div>
                      <div className="user-name">{getApproverName(sortedNodes[currentNodeIdx])}</div>
                      <div className="user-role">审批人</div>
                    </div>
                  </div>
                </header>

                <div className="pwp-body">
                  <h4>📋 审批内容摘要</h4>
                  <div
                    className="content-summary"
                    role="list"
                    aria-label="表单填写摘要"
                  >
                    {formFields.slice(0, 4).map(f => (
                      <div key={f.id} className="cs-row" role="listitem">
                        <span className="cs-label">{f.label}：</span>
                        <span className="cs-value">
                          {Array.isArray(formData[f.id])
                            ? formData[f.id].join('、')
                            : formData[f.id] || `（${f.placeholder || '未填写'}）`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ marginTop: 20 }}>💬 审批意见</h4>
                  <textarea
                    rows={3}
                    placeholder="请输入审批意见..."
                    className="comment-input"
                    value={comments[sortedNodes[currentNodeIdx].id]?.[0]?.content || ''}
                    readOnly
                    aria-label={`${sortedNodes[currentNodeIdx].name} 审批意见`}
                  />
                </div>

                <footer className="pwp-footer">
                  <div
                    className="pwp-nav"
                    role="group"
                    aria-label="节点导航"
                  >
                    <button
                      className="btn btn-outline"
                      onClick={prevNode}
                      disabled={currentNodeIdx === 0}
                      aria-label="查看上一个节点"
                    >
                      ← 上一步
                    </button>
                    <span className="step-indicator" aria-live="polite">
                      第 {currentNodeIdx + 1} / {sortedNodes.length} 节点
                    </span>
                    <button
                      className="btn btn-outline"
                      onClick={nextNode}
                      disabled={currentNodeIdx === sortedNodes.length - 1}
                      aria-label="查看下一个节点"
                    >
                      下一步 →
                    </button>
                  </div>
                  <div
                    className="pwp-actions"
                    role="group"
                    aria-label="审批操作"
                  >
                    <button
                      className="btn btn-danger"
                      onClick={reject}
                      aria-label="驳回当前审批"
                    >
                      ❌ 驳回
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={approve}
                      aria-label="同意当前审批"
                    >
                      ✅ 同意
                    </button>
                  </div>
                </footer>
              </article>
            </div>
          )}

          {view === 'timeline' && (
            <div
              className="preview-timeline"
              role="tabpanel"
              id="pv-panel-timeline"
              aria-labelledby="pv-tab-timeline"
              tabIndex={0}
            >
              <article className="pt-info-card" aria-label="审批概要">
                <div className="ptic-status success" role="status" aria-label="审批状态">
                  <span className="status-icon" aria-hidden="true">✓</span>
                  <div>
                    <h3>审批完成</h3>
                    <p>共 {sortedNodes.length} 个节点 · 耗时约 2 天</p>
                  </div>
                </div>
                <div
                  className="ptic-summary"
                  role="list"
                  aria-label="申请基础信息"
                >
                  <div className="sum-item" role="listitem">
                    <span className="sum-label">申请编号</span>
                    <span className="sum-value">QF{Date.now().toString().slice(-8)}</span>
                  </div>
                  <div className="sum-item" role="listitem">
                    <span className="sum-label">发起人</span>
                    <span className="sum-value">张三 · 技术部</span>
                  </div>
                  <div className="sum-item" role="listitem">
                    <span className="sum-label">提交时间</span>
                    <span className="sum-value">{new Date().toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </article>

              <ol
                className="timeline-list"
                role="list"
                aria-label={`审批轨迹时间线，共 ${sortedNodes.length} 条记录`}
              >
                {sortedNodes.map((node, i) => {
                  const nodeComments = comments[node.id] || []
                  const isApproved = i < currentNodeIdx || (nodeComments.length > 0 && nodeComments[0].action === '同意')
                  return (
                    <li
                      key={node.id}
                      role="listitem"
                      aria-label={`时间线第 ${i + 1} 项：${getNodeTypeName(node.type)} 节点「${node.name}」，处理人${getApproverName(node)}，${isApproved ? '已完成' : i === currentNodeIdx ? '待处理' : '未开始'}`}
                      className={`tl-item ${isApproved ? 'approved' : i === currentNodeIdx ? 'pending' : 'waiting'}`}
                    >
                      <div className="tl-dot" aria-hidden="true">
                        {isApproved ? '✓' : i === currentNodeIdx ? '⏳' : '○'}
                      </div>
                      <div className="tl-content">
                        <div className="tl-header">
                          <span className={`tl-node ${node.type}`}>{node.name}</span>
                          <span className="tl-time">
                            {isApproved
                              ? formatTime(new Date(Date.now() - (sortedNodes.length - i) * 3600000))
                              : i === currentNodeIdx ? '待处理' : '未开始'}
                          </span>
                        </div>
                        <div className="tl-user">
                          <span className="user-dot" aria-hidden="true">{getApproverName(node).slice(0, 1)}</span>
                          <span>{getApproverName(node)}</span>
                        </div>
                        {nodeComments.length > 0 && (
                          <div className="tl-comment">
                            <span
                              className={`tl-action ${nodeComments[0].action === '同意' ? 'pass' : 'reject'}`}
                              role="note"
                            >
                              {nodeComments[0].action}
                            </span>
                            <span>{nodeComments[0].content}</span>
                          </div>
                        )}
                        {node.type === NODE_TYPES.CC && isApproved && (
                          <div className="tl-comment">
                            <span className="tl-action notice">已查看</span>
                            <span>抄送人已确认阅知</span>
                          </div>
                        )}
                      </div>
                      {i < sortedNodes.length - 1 && <div className="tl-line" aria-hidden="true"></div>}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function renderField(field, value, onChange) {
  const baseClass = 'preview-input'
  const required = !!field.required
  const ariaLabel = `${field.label}${required ? '（必填）' : ''}`

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          rows={3}
          value={value || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        />
      )
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        >
          <option value="">请选择...</option>
          {(field.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )
    case 'radio':
      return (
        <fieldset className="radio-group">
          <legend className="visually-hidden">{ariaLabel}</legend>
          {(field.options || []).map((opt, i) => (
            <label key={i}>
              <input
                type="radio"
                name={field.id}
                checked={value === opt}
                onChange={() => onChange(opt)}
                aria-label={`${field.label}，选项${opt}`}
              />
              <span>{opt}</span>
            </label>
          ))}
        </fieldset>
      )
    case 'checkbox':
      return (
        <fieldset className="check-group">
          <legend className="visually-hidden">
            {ariaLabel}，可多选
          </legend>
          {(field.options || []).map((opt, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={(value || []).includes(opt)}
                onChange={(e) => {
                  const arr = value || []
                  onChange(e.target.checked ? [...arr, opt] : arr.filter(x => x !== opt))
                }}
                aria-label={`${field.label}，选项${opt}`}
              />
              <span>{opt}</span>
            </label>
          ))}
        </fieldset>
      )
    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        />
      )
    case 'file':
      return (
        <div className="upload-box" role="group" aria-label={`${field.label}附件上传`}>
          <span className="ub-icon" aria-hidden="true">📤</span>
          <span>点击或拖拽文件到此处</span>
        </div>
      )
    case 'user':
      return (
        <div
          className={`${baseClass} selector`}
          role="group"
          aria-label={`${field.label}人员选择`}
        >
          <span>👤 {value || '请选择人员'}</span>
          <button
            type="button"
            className="sel-btn"
            aria-label={`打开${field.label}人员选择器`}
          >
            选择
          </button>
        </div>
      )
    case 'dept':
      return (
        <div
          className={`${baseClass} selector`}
          role="group"
          aria-label={`${field.label}部门选择`}
        >
          <span>🏢 {value || '请选择部门'}</span>
          <button
            type="button"
            className="sel-btn"
            aria-label={`打开${field.label}部门选择器`}
          >
            选择
          </button>
        </div>
      )
    case 'number':
      return (
        <div className="number-input-wrap" role="group" aria-label={ariaLabel}>
          <input
            type="number"
            value={value === undefined || value === null ? '' : value}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${ariaLabel}输入框`}
            aria-required={required || undefined}
          />
          {field.unit && <span className="unit">{field.unit}</span>}
        </div>
      )
    default:
      return (
        <input
          type="text"
          value={value || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        />
      )
  }
}

function getApproverName(node) {
  if (node.type === NODE_TYPES.START) return '申请人（张三）'
  if (node.type === NODE_TYPES.END) return '系统'
  if (node.approver && !node.approver.includes('请选择')) return node.approver
  const names = ['李主管', '王经理', '赵总监', '钱总裁', '人事部', '财务部']
  return names[Math.abs(node.id.length) % names.length]
}

function getNodeIcon(type) {
  const map = {
    [NODE_TYPES.START]: '▶',
    [NODE_TYPES.APPROVAL]: '审',
    [NODE_TYPES.CONDITION]: '？',
    [NODE_TYPES.CC]: '抄',
    [NODE_TYPES.END]: '终',
  }
  return map[type] || '●'
}

function getNodeTypeName(type) {
  const map = {
    [NODE_TYPES.START]: '开始',
    [NODE_TYPES.APPROVAL]: '审批',
    [NODE_TYPES.CC]: '抄送',
    [NODE_TYPES.END]: '结束',
  }
  return map[type] || '节点'
}

function formatTime(d) {
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
