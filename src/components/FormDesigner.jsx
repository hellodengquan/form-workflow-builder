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
    const fieldType = e.dataTransfer.getData('fieldType')
    if (fieldType && window.__addFieldFromDrop) {
      window.__addFieldFromDrop(fieldType)
    }
  }

  if (fields.length === 0) {
    return (
      <div
        className="form-designer empty"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDroppedField}
      >
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>尚未添加任何字段</h3>
          <p>从左侧「字段库」选择或拖拽字段到此处</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="form-designer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDroppedField}
    >
      <div className="form-header">
        <div className="form-title">
          <span className="title-icon">📝</span>
          <div>
            <h2>请假申请表单</h2>
            <p>共 {fields.length} 个字段</p>
          </div>
        </div>
        <div className="form-meta">
          <span className="badge badge-blue">草稿</span>
          <span className="meta-item">👤 申请人可见</span>
        </div>
      </div>

      <div className="form-canvas">
        <div className="form-card">
          <div className="card-header">
            <span className="card-badge">表单内容</span>
          </div>
          <div className="card-body">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`field-item ${selectedId === field.id ? 'selected' : ''} ${isDragOver === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''} ${validationErrors[field.id]?.length ? 'has-error' : ''}`}
                onClick={() => onSelect(field.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="field-drag-handle" title="拖拽排序">⋮⋮</div>

                <div className="field-preview">
                  <div className="field-type-icon" title={field.type}>
                    {FIELD_ICONS[field.type]}
                  </div>
                  <div className="field-content">
                    <div className="field-label-row">
                      <span className="label-text">{field.label}</span>
                      {field.required && <span className="required-mark">*</span>}
                      <span className="field-type-tag">{getTypeName(field.type)}</span>
                    </div>
                    {renderFieldPreview(field)}
                    {validationErrors[field.id] && validationErrors[field.id].length > 0 && (
                      <div className="field-errors" role="alert">
                        {validationErrors[field.id].map((err, i) => (
                          <span key={i} className="field-error">
                            <span className="error-icon">⚠️</span>
                            {err}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="field-actions">
                  <button
                    className="action-btn move-up"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (index > 0) onMove(index, index - 1)
                    }}
                    disabled={index === 0}
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    className="action-btn move-down"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (index < fields.length - 1) onMove(index, index + 1)
                    }}
                    disabled={index === fields.length - 1}
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(field.id)
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
      return <div className={`${baseClass} textarea`}>{field.placeholder}</div>
    case 'select':
      return (
        <div className={`${baseClass} select`}>
          <span>请选择...</span>
          <span className="select-arrow">▼</span>
        </div>
      )
    case 'radio':
      return (
        <div className="preview-options">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="opt-item">
              <span className="radio-dot"></span>
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <div className="preview-options">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="opt-item">
              <span className="check-box">☐</span>
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'date':
      return (
        <div className={`${baseClass} date`}>
          <span>📅 选择日期</span>
        </div>
      )
    case 'file':
      return (
        <div className="preview-upload">
          <span className="upload-icon">📎</span>
          <span>点击或拖拽文件到此处上传</span>
        </div>
      )
    case 'user':
      return (
        <div className={`${baseClass} user`}>
          <span>👤 请选择人员</span>
        </div>
      )
    case 'dept':
      return (
        <div className={`${baseClass} dept`}>
          <span>🏢 请选择部门</span>
        </div>
      )
    case 'number':
      return (
        <div className={`${baseClass} number`}>
          <span>{field.placeholder || '请输入数字'}</span>
          {field.unit && <span className="unit">{field.unit}</span>}
        </div>
      )
    default:
      return <div className={baseClass}>{field.placeholder}</div>
  }
}
