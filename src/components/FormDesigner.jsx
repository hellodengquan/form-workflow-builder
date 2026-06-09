import { useState } from 'react'
import { FIELD_TYPES } from '../utils/constants'

const FIELD_ICONS = Object.fromEntries(FIELD_TYPES.map(f => [f.type, f.icon]))

export default function FormDesigner({
  fields,
  selectedId,
  onSelect,
  onUpdate,
  onRemove,
  onMove,
  validationErrors = {},
}) {
  const [dragIndex, setDragIndex] = useState(null)
  const [isDragOver, setIsDragOver] = useState(null)

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      setIsDragOver(index)
    }
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      onMove(dragIndex, index)
    }
    setDragIndex(null)
    setIsDragOver(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setIsDragOver(null)
  }

  const handleDroppedField = (e) => {
    e.preventDefault()
    if (!e.dataTransfer) return
    try {
      const fieldType = e.dataTransfer.getData('fieldType')
      if (fieldType && window.__addFieldFromDrop) {
        window.__addFieldFromDrop(fieldType)
      }
    } catch (_err) {
      // 忽略 dataTransfer 在某些环境中的异常
    }
  }

  const handleKeyDown = (e, field, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(field.id)
    } else if (e.altKey && (e.key === 'ArrowUp')) {
      e.preventDefault()
      if (index > 0) onMove(index, index - 1)
    } else if (e.altKey && (e.key === 'ArrowDown')) {
      e.preventDefault()
      if (index < fields.length - 1) onMove(index, index + 1)
    } else if (e.key === 'Delete' && selectedId === field.id) {
      e.preventDefault()
      onRemove(field.id)
    }
  }

  if (fields.length === 0) {
    return (
      <section
        aria-label="表单设计区域（空）"
        className="form-designer empty"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDroppedField}
        role="region"
      >
        <div className="empty-state" role="status">
          <div className="empty-icon" aria-hidden="true">📋</div>
          <h3>尚未添加任何字段</h3>
          <p>从左侧「字段库」选择或拖拽字段到此处</p>
          <p className="keyboard-hint" aria-live="polite">
            💡 键盘操作：Alt+↑/↓ 调整字段顺序，Delete 删除选中字段
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label={`表单设计区域，共 ${fields.length} 个字段`}
      aria-describedby="form-designer-hint"
      className="form-designer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDroppedField}
      role="region"
    >
      <span id="form-designer-hint" className="visually-hidden">
        键盘操作提示：Tab 聚焦字段，Enter 选中编辑，Alt + 方向键上下移动，Delete 删除
      </span>

      <header className="form-header">
        <div className="form-title">
          <span className="title-icon" aria-hidden="true">📝</span>
          <div>
            <h2>请假申请表单</h2>
            <p>共 {fields.length} 个字段</p>
          </div>
        </div>
        <div className="form-meta">
          <span className="badge badge-blue" role="status" aria-live="polite">草稿</span>
          <span className="meta-item" aria-label="可见范围为申请人">👤 申请人可见</span>
        </div>
      </header>

      <div className="form-canvas">
        <article className="form-card" aria-label="表单内容画布">
          <div className="card-header">
            <span className="card-badge" role="note">表单内容</span>
          </div>
          <div
            className="card-body"
            role="list"
            aria-label="表单字段列表，支持拖拽排序"
          >
            {fields.map((field, index) => {
              const hasError = validationErrors[field.id]?.length > 0
              const isSelected = selectedId === field.id
              return (
                <div
                  key={field.id}
                  role="listitem"
                  aria-label={`第 ${index + 1} 项：${field.label}（${getTypeName(field.type)}字段${field.required ? '，必填' : ''}${hasError ? `，存在 ${validationErrors[field.id].length} 个校验错误` : ''}）`}
                  aria-selected={isSelected}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? `field-errors-${field.id}` : undefined}
                  aria-posinset={index + 1}
                  aria-setsize={fields.length}
                  tabIndex={0}
                  className={`field-item ${isSelected ? 'selected' : ''} ${isDragOver === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''} ${hasError ? 'has-error' : ''}`}
                  onClick={() => onSelect(field.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={(e) => handleKeyDown(e, field, index)}
                >
                  <div
                    className="field-drag-handle"
                    title="拖拽排序（Alt+方向键上下移动）"
                    aria-label={`拖拽排序 ${field.label}`}
                    role="separator"
                    tabIndex={-1}
                  >
                    ⋮⋮
                  </div>

                  <div className="field-preview">
                    <div
                      className="field-type-icon"
                      title={`${field.type}类型`}
                      aria-hidden="true"
                    >
                      {FIELD_ICONS[field.type]}
                    </div>
                    <div className="field-content">
                      <div className="field-label-row">
                        <span className="label-text">{field.label}</span>
                        {field.required && (
                          <span
                            className="required-mark"
                            aria-label="必填字段"
                            title="此字段为必填"
                          >*</span>
                        )}
                        <span className="field-type-tag" aria-hidden="true">{getTypeName(field.type)}</span>
                      </div>
                      {renderFieldPreview(field)}
                      {hasError && (
                        <div
                          className="field-errors"
                          role="alert"
                          id={`field-errors-${field.id}`}
                          aria-live="assertive"
                        >
                          {validationErrors[field.id].map((err, i) => (
                            <span
                              key={i}
                              className="field-error"
                              role="listitem"
                            >
                              <span className="error-icon" aria-hidden="true">⚠️</span>
                              {err}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="field-actions"
                    role="group"
                    aria-label={`${field.label} 字段操作`}
                  >
                    <button
                      type="button"
                      className="action-btn move-up"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (index > 0) onMove(index, index - 1)
                      }}
                      disabled={index === 0}
                      title="上移一个位置（Alt+↑）"
                      aria-label={`${field.label}上移一位`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="action-btn move-down"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (index < fields.length - 1) onMove(index, index + 1)
                      }}
                      disabled={index === fields.length - 1}
                      title="下移一个位置（Alt+↓）"
                      aria-label={`${field.label}下移一位`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(field.id)
                      }}
                      title="删除字段（选中后按 Delete）"
                      aria-label={`删除${field.label}字段`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </div>
    </section>
  )
}

function getTypeName(type) {
  const map = {
    text: '文本',
    textarea: '多行文本',
    number: '数字',
    select: '下拉',
    radio: '单选',
    checkbox: '多选',
    date: '日期',
    file: '附件',
    user: '人员',
    dept: '部门',
  }
  return map[type] || type
}

function renderFieldPreview(field) {
  const baseClass = 'preview-input'

  switch (field.type) {
    case 'textarea':
      return (
        <div className={`${baseClass} textarea`} role="textbox" aria-readonly="true" aria-hidden="true">
          {field.placeholder}
        </div>
      )
    case 'select':
      return (
        <div className={`${baseClass} select`} role="combobox" aria-readonly="true" aria-hidden="true">
          <span>请选择...</span>
          <span className="select-arrow" aria-hidden="true">▼</span>
        </div>
      )
    case 'radio':
      return (
        <div className="preview-options" role="radiogroup" aria-hidden="true">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="opt-item">
              <span className="radio-dot" aria-hidden="true"></span>
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <div className="preview-options" role="group" aria-hidden="true">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="opt-item">
              <span className="check-box" aria-hidden="true">☐</span>
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'date':
      return (
        <div className={`${baseClass} date`} role="group" aria-label="日期选择器预览" aria-hidden="true">
          <span>📅 选择日期</span>
        </div>
      )
    case 'file':
      return (
        <div className="preview-upload" role="group" aria-label="附件上传预览" aria-hidden="true">
          <span className="upload-icon" aria-hidden="true">📎</span>
          <span>点击或拖拽文件到此处上传</span>
        </div>
      )
    case 'user':
      return (
        <div className={`${baseClass} user`} role="group" aria-label="人员选择预览" aria-hidden="true">
          <span>👤 请选择人员</span>
        </div>
      )
    case 'dept':
      return (
        <div className={`${baseClass} dept`} role="group" aria-label="部门选择预览" aria-hidden="true">
          <span>🏢 请选择部门</span>
        </div>
      )
    case 'number':
      return (
        <div className={`${baseClass} number`} role="spinbutton" aria-readonly="true" aria-hidden="true">
          <span>{field.placeholder || '请输入数字'}</span>
          {field.unit && <span className="unit" aria-hidden="true">{field.unit}</span>}
        </div>
      )
    default:
      return (
        <div className={baseClass} role="textbox" aria-readonly="true" aria-hidden="true">
          {field.placeholder}
        </div>
      )
  }
}
