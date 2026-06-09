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

  return (
    <div className="field-library">
      <h3 className="panel-title">字段库</h3>
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 搜索字段类型..."
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
        />
      </div>
      <div className="field-grid">
        {filteredTypes.map((field) => (
          <div
            key={field.type}
            className={`field-card ${dragType === field.type ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, field.type)}
            onDragEnd={() => setDragType(null)}
            onClick={() => onAddField(field.type)}
            title="点击或拖拽添加到表单"
          >
            <span className="field-icon">{field.icon}</span>
            <span className="field-label">{field.label}</span>
            <span className="field-add-hint">+</span>
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
    </div>
  )
}
