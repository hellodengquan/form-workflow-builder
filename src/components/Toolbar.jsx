import { useState } from 'react'

export default function Toolbar({ activeTab, onTabChange, onPreview, formFields, workflowNodes }) {
  const [showSave, setShowSave] = useState(false)

  const handleSave = () => {
    setShowSave(true)
    setTimeout(() => setShowSave(false), 2000)
  }

  return (
    <header className="app-toolbar">
      <div className="toolbar-left">
        <div className="brand">
          <div className="brand-logo">
            <span>📋</span>
          </div>
          <div className="brand-text">
            <h1>FlowBuilder</h1>
            <p>表单审批流程构建器</p>
          </div>
        </div>

        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => onTabChange('form')}
          >
            <span className="tab-icon">📝</span>
            <span>表单设计</span>
            <span className="tab-badge">{formFields.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => onTabChange('workflow')}
          >
            <span className="tab-icon">🔄</span>
            <span>流程设计</span>
            <span className="tab-badge">{workflowNodes.length}</span>
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <button className="tbar-btn ghost" onClick={handleSave}>
          <span>💾</span>
          <span>保存草稿</span>
        </button>
        <button className="tbar-btn outline" onClick={handleSave}>
          <span>📤</span>
          <span>发布流程</span>
        </button>
        <button className="tbar-btn primary" onClick={onPreview}>
          <span>👁️</span>
          <span>预览体验</span>
        </button>

        <div className="avatar">
          <div className="avatar-circle">张</div>
          <div className="avatar-dropdown">
            <span className="avatar-name">张三</span>
            <span className="avatar-role">管理员</span>
          </div>
        </div>
      </div>

      {showSave && (
        <div className="toast show">
          <span className="toast-icon">✅</span>
          <span>保存成功！</span>
        </div>
      )}
    </header>
  )
}
