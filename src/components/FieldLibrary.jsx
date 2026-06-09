import { useState } from 'react'
import { FIELD_TYPES } from '../utils/constants'

export default function FieldLibrary({ onAddField }) {
  const [dragType, setDragType] = useState(null)
  const [searchKey, setSearchKey] = useState('')

  const filteredTypes = FIELD_TYPES.filter(f =>
    f.label.includes(searchKey) || f.type.includes(searchKey.toLowerCase())
  )

  const handleDragStart = (e, type) => {
    setDragType(type)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('fieldType', type)
  }

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onAddField(type)
    }
  }

  return (
    <section
      className="field-library"
      role="region"
      aria-label="字段库：提供 10 种可拖拽或点击添加的表单字段"
    >
      <h3 className="panel-title">字段库</h3>
      <div className="search-box">
        <label className="visually-hidden" htmlFor="field-search">搜索字段类型</label>
        <input
          id="field-search"
          type="text"
          placeholder="🔍 搜索字段类型..."
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          aria-label="搜索字段类型"
        />
      </div>
      <div
        className="field-grid"
        role="list"
        aria-label={`可用字段列表，共 ${filteredTypes.length} 个字段类型`}
      >
        {filteredTypes.map((field) => (
          <div
            key={field.type}
            role="button"
            tabIndex={0}
            aria-label={`添加${field.label}字段（${field.description || '点击添加或拖拽到设计区'}）`}
            className={`field-card ${dragType === field.type ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, field.type)}
            onDragEnd={() => setDragType(null)}
            onClick={() => onAddField(field.type)}
            onKeyDown={(e) => handleKeyDown(e, field.type)}
            title={`点击或拖拽添加${field.label}字段`}
          >
            <span className="field-icon" aria-hidden="true">{field.icon}</span>
            <span className="field-label">{field.label}</span>
            <span className="field-add-hint" aria-hidden="true">+</span>
          </div>
        ))}
      </div>
      <div className="library-tips">
        <h4>💡 使用说明</h4>
        <ul>
          <li>点击字段卡片可快速添加</li>
          <li>拖拽字段卡片到设计区</li>
          <li>点击已添加字段可编辑属性</li>
        </ul>
      </div>
    </section>
  )
}
