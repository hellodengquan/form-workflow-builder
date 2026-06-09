import { useState, useCallback, useMemo, useEffect } from 'react'
import FieldLibrary from './components/FieldLibrary'
import FormDesigner from './components/FormDesigner'
import WorkflowDesigner from './components/WorkflowDesigner'
import PreviewPanel from './components/PreviewPanel'
import PropertyPanel from './components/PropertyPanel'
import Toolbar from './components/Toolbar'
import ErrorBoundary from './components/ErrorBoundary'
import { FIELD_TYPES, NODE_TYPES, generateId } from './utils/constants'
import { useLocalStorage, STORAGE_KEYS } from './hooks/useLocalStorage'
import { validateAllFields } from './utils/validation'

const DEFAULT_FIELDS = () => ([
  { id: generateId(), type: 'text', label: '申请标题', placeholder: '请输入申请标题', required: true },
  { id: generateId(), type: 'textarea', label: '申请说明', placeholder: '请详细说明申请事由', required: true },
  { id: generateId(), type: 'number', label: '申请金额', placeholder: '请输入金额', required: false, unit: '元' },
  { id: generateId(), type: 'date', label: '期望完成日期', required: false },
])

const DEFAULT_NODES = () => ([
  { id: 'start-1', type: NODE_TYPES.START, name: '提交申请', x: 320, y: 40, approver: '申请人' },
  { id: 'approval-1', type: NODE_TYPES.APPROVAL, name: '直属主管审批', x: 320, y: 160, approver: '直属主管' },
  { id: 'approval-2', type: NODE_TYPES.APPROVAL, name: '部门经理审批', x: 320, y: 280, approver: '部门经理' },
  { id: 'cc-1', type: NODE_TYPES.CC, name: '抄送人事部', x: 320, y: 400, approver: '人事部' },
  { id: 'end-1', type: NODE_TYPES.END, name: '流程结束', x: 320, y: 520, approver: '系统' },
])

const MOBILE_BREAKPOINT = 1024
const RECOVERY_KEY = 'form-workflow-builder:crash-recovery'

function App() {
  const [activeTab, setActiveTab] = useState('form')
  const [formFields, setFormFields] = useLocalStorage(STORAGE_KEYS.FORM_FIELDS, DEFAULT_FIELDS)
  const [workflowNodes, setWorkflowNodes] = useLocalStorage(STORAGE_KEYS.WORKFLOW_NODES, DEFAULT_NODES)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [previewFormData, setPreviewFormData] = useState({})
  const [showValidationToast, setShowValidationToast] = useState(null)
  const [recoveryAvailable, setRecoveryAvailable] = useState(null)

  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )
  const [mobileView, setMobileView] = useState('center')
  const [drawerOpen, setDrawerOpen] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const age = Date.now() - (parsed?.capturedAt || 0)
        if (age < 1000 * 60 * 60 * 24 && (parsed.formFields || parsed.workflowNodes)) {
          setRecoveryAvailable(parsed)
        } else {
          localStorage.removeItem(RECOVERY_KEY)
        }
      }
    } catch (_) {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < MOBILE_BREAKPOINT
      setIsNarrowViewport(narrow)
      if (!narrow) {
        setDrawerOpen(null)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (showPreview) {
          setShowPreview(false)
        } else if (drawerOpen) {
          setDrawerOpen(null)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setDrawerOpen(prev => prev === 'left' ? null : 'left')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setDrawerOpen(prev => prev === 'right' ? null : 'right')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showPreview, drawerOpen])

  const validationResult = useMemo(() => {
    return validateAllFields(formFields, previewFormData)
  }, [formFields, previewFormData])

  const addField = useCallback((fieldType) => {
    const fieldDef = FIELD_TYPES.find(f => f.type === fieldType)
    const newField = {
      id: generateId(),
      type: fieldType,
      label: fieldDef.defaultLabel,
      placeholder: `请输入${fieldDef.defaultLabel}`,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(fieldType)
        ? ['选项一', '选项二', '选项三']
        : undefined,
    }
    setFormFields(prev => [...prev, newField])
    setSelectedFieldId(newField.id)
    if (isNarrowViewport) setDrawerOpen(null)
  }, [setFormFields, isNarrowViewport])

  const updateField = useCallback((fieldId, updates) => {
    setFormFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }, [setFormFields])

  const removeField = useCallback((fieldId) => {
    setFormFields(prev => prev.filter(f => f.id !== fieldId))
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }, [selectedFieldId, setFormFields])

  const moveField = useCallback((dragIndex, hoverIndex) => {
    setFormFields(prev => {
      const newFields = [...prev]
      const [draggedItem] = newFields.splice(dragIndex, 1)
      newFields.splice(hoverIndex, 0, draggedItem)
      return newFields
    })
  }, [setFormFields])

  const addNode = useCallback((nodeType, afterNodeId) => {
    const newNode = {
      id: `${nodeType}-${generateId()}`,
      type: nodeType,
      name: nodeType === NODE_TYPES.APPROVAL ? '新审批节点' :
            nodeType === NODE_TYPES.CC ? '新抄送节点' :
            nodeType === NODE_TYPES.CONDITION ? '条件分支' : '新节点',
      approver: nodeType === NODE_TYPES.START ? '申请人' :
                nodeType === NODE_TYPES.END ? '系统' : '请选择审批人',
      x: 320,
      y: 600,
    }
    setWorkflowNodes(prev => {
      const afterIndex = prev.findIndex(n => n.id === afterNodeId)
      const affected = prev.slice(afterIndex + 1).map(n => ({ ...n, y: n.y + 120 }))
      const before = prev.slice(0, afterIndex + 1)
      newNode.y = before[before.length - 1].y + 120
      return [...before, newNode, ...affected]
    })
    setSelectedNodeId(newNode.id)
  }, [setWorkflowNodes])

  const updateNode = useCallback((nodeId, updates) => {
    setWorkflowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n))
  }, [setWorkflowNodes])

  const removeNode = useCallback((nodeId) => {
    setWorkflowNodes(prev => {
      const nodeIndex = prev.findIndex(n => n.id === nodeId)
      const node = prev[nodeIndex]
      if (!node || node.type === NODE_TYPES.START || node.type === NODE_TYPES.END) return prev
      const affected = prev.slice(nodeIndex + 1).map(n => ({ ...n, y: n.y - 120 }))
      return [...prev.slice(0, nodeIndex), ...affected]
    })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }, [selectedNodeId, setWorkflowNodes])

  const handlePreview = useCallback(() => {
    setShowPreview(true)
    setPreviewFormData({})
    setValidationErrors({})
  }, [])

  const handleValidate = useCallback(() => {
    const result = validateAllFields(formFields, previewFormData)
    setValidationErrors(result.errors)
    if (result.valid) {
      setShowValidationToast({ type: 'success', msg: '🎉 所有字段校验通过！' })
    } else {
      const errorCount = Object.keys(result.errors).length
      setShowValidationToast({ type: 'error', msg: `⚠️ 发现 ${errorCount} 个字段需要修正` })
    }
    setTimeout(() => setShowValidationToast(null), 2500)
  }, [formFields, previewFormData])

  const selectedField = formFields.find(f => f.id === selectedFieldId)
  const selectedNode = workflowNodes.find(n => n.id === selectedNodeId)

  const handleResetBoundary = useCallback(() => {
    setSelectedFieldId(null)
    setSelectedNodeId(null)
    setValidationErrors({})
    setPreviewFormData({})
    setShowPreview(false)
    setDrawerOpen(null)
  }, [])

  const handleCapture = useCallback((ctx) => {
    try {
      const snapshot = {
        formFields,
        workflowNodes,
        selectedFieldId,
        selectedNodeId,
        activeTab,
        previewFormData,
        capturedAt: Date.now(),
        errorMessage: ctx.error?.message || String(ctx.error),
      }
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(snapshot))
      if (typeof console !== 'undefined' && console.info) {
        console.info('[Recovery] 崩溃前已将编辑快照写入 localStorage（key=', RECOVERY_KEY, '，大小=', JSON.stringify(snapshot).length, '字节）')
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Recovery] 写入崩溃快照失败：', err)
      }
    }
  }, [formFields, workflowNodes, selectedFieldId, selectedNodeId, activeTab, previewFormData])

  const handleRestore = useCallback((snapshot) => {
    if (!snapshot) return false
    let applied = false
    if (Array.isArray(snapshot.formFields) && snapshot.formFields.length > 0) {
      setFormFields(snapshot.formFields)
      applied = true
    }
    if (Array.isArray(snapshot.workflowNodes) && snapshot.workflowNodes.length > 0) {
      setWorkflowNodes(snapshot.workflowNodes)
      applied = true
    }
    if (snapshot.activeTab === 'form' || snapshot.activeTab === 'workflow') {
      setActiveTab(snapshot.activeTab)
    }
    if (typeof snapshot.selectedFieldId === 'string') {
      setSelectedFieldId(snapshot.selectedFieldId)
    }
    if (typeof snapshot.selectedNodeId === 'string') {
      setSelectedNodeId(snapshot.selectedNodeId)
    }
    if (snapshot.previewFormData && typeof snapshot.previewFormData === 'object') {
      setPreviewFormData(snapshot.previewFormData)
    }
    try {
      localStorage.removeItem(RECOVERY_KEY)
    } catch (_) {}
    setRecoveryAvailable(null)
    return applied ? true : false
  }, [setFormFields, setWorkflowNodes])

  const handleDismissRecovery = () => {
    setRecoveryAvailable(null)
    try {
      localStorage.removeItem(RECOVERY_KEY)
    } catch (_) {}
  }

  const renderLeftPanel = () => (
    <aside
      className={`left-panel ${drawerOpen === 'left' ? 'drawer-open' : ''}`}
      role="region"
      aria-label={activeTab === 'form' ? '字段库面板（Ctrl+B 切换）' : '节点库面板（Ctrl+B 切换）'}
      aria-hidden={isNarrowViewport && drawerOpen !== 'left'}
    >
      {isNarrowViewport && (
        <div className="drawer-header">
          <span className="drawer-title">
            {activeTab === 'form' ? '📚 字段库' : '🧱 节点库'}
          </span>
          <button
            type="button"
            className="drawer-close"
            aria-label="关闭侧边面板"
            onClick={() => setDrawerOpen(null)}
          >×</button>
        </div>
      )}
      {activeTab === 'form' && (
        <FieldLibrary onAddField={(type) => {
          addField(type)
        }} />
      )}
      {activeTab === 'workflow' && (
        <div className="node-library">
          <h3 className="panel-title">节点库</h3>
          <div className="node-lib-list">
            {[NODE_TYPES.APPROVAL, NODE_TYPES.CONDITION, NODE_TYPES.CC].map(type => (
              <div key={type} className="node-lib-item">
                <span className="node-lib-icon" style={{ background: getNodeColor(type) }} aria-hidden="true">
                  {getNodeIcon(type)}
                </span>
                <span className="node-lib-label">{getNodeLabel(type)}</span>
                <button
                  type="button"
                  className="node-add-btn"
                  aria-label={`添加${getNodeLabel(type)}`}
                  onClick={() => {
                    const lastBeforeEnd = workflowNodes.filter(n => n.type !== NODE_TYPES.END).pop()
                    addNode(type, lastBeforeEnd?.id || 'start-1')
                  }}
                >
                  + 添加
                </button>
              </div>
            ))}
          </div>
          <div className="workflow-tips">
            <h4>💡 操作提示</h4>
            <ul>
              <li>点击节点可编辑属性</li>
              <li>悬停节点显示操作按钮</li>
              <li>点击「+」可在节点后插入新节点</li>
              <li>配置自动保存到本地</li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  )

  const renderRightPanel = () => (
    <aside
      className={`right-panel ${drawerOpen === 'right' ? 'drawer-open' : ''}`}
      role="region"
      aria-label="属性配置面板（Ctrl+P 切换）"
      aria-hidden={isNarrowViewport && drawerOpen !== 'right'}
    >
      {isNarrowViewport && (
        <div className="drawer-header">
          <span className="drawer-title">⚙️ 属性配置</span>
          <button
            type="button"
            className="drawer-close"
            aria-label="关闭属性面板"
            onClick={() => setDrawerOpen(null)}
          >×</button>
        </div>
      )}
      <PropertyPanel
        activeTab={activeTab}
        selectedField={selectedField}
        selectedNode={selectedNode}
        onUpdateField={(id, up) => {
          updateField(id, up)
        }}
        onUpdateNode={(id, up) => {
          updateNode(id, up)
        }}
      />
    </aside>
  )

  const renderCenterPanel = () => (
    <main
      className="center-panel"
      role="main"
      aria-label={activeTab === 'form' ? '表单设计主区域' : '流程设计主区域'}
    >
      {isNarrowViewport && (
        <nav
          className="mobile-drawer-tabs"
          role="tablist"
          aria-label="移动端面板切换"
        >
          <button
            type="button"
            role="tab"
            aria-selected={drawerOpen === 'left'}
            aria-label={`打开${activeTab === 'form' ? '字段库' : '节点库'}`}
            className={`mdtab left ${drawerOpen === 'left' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(prev => prev === 'left' ? null : 'left')}
          >
            {activeTab === 'form' ? '📚 字段库' : '🧱 节点库'}
          </button>
          <div className="mdtab-center" role="group" aria-label="当前工作区">
            {activeTab === 'form' ? `📝 表单设计（${formFields.length}字段）` : `🔄 流程设计（${workflowNodes.length}节点）`}
          </div>
          <button
            type="button"
            role="tab"
            aria-selected={drawerOpen === 'right'}
            aria-label="打开属性配置面板"
            className={`mdtab right ${drawerOpen === 'right' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(prev => prev === 'right' ? null : 'right')}
          >
            ⚙️ 属性
            {selectedField || selectedNode ? (
              <span className="mdtab-dot" aria-label="当前有选中项"></span>
            ) : null}
          </button>
        </nav>
      )}
      {activeTab === 'form' && (
        <FormDesigner
          fields={formFields}
          selectedId={selectedFieldId}
          onSelect={setSelectedFieldId}
          onUpdate={updateField}
          onRemove={removeField}
          onMove={moveField}
          validationErrors={validationErrors}
        />
      )}
      {activeTab === 'workflow' && (
        <WorkflowDesigner
          nodes={workflowNodes}
          selectedId={selectedNodeId}
          onSelect={setSelectedNodeId}
          onAddNode={addNode}
          onRemoveNode={removeNode}
        />
      )}
    </main>
  )

  return (
    <div className={`app-container ${isNarrowViewport ? 'viewport-narrow' : 'viewport-wide'}`}>
      <a href="#main-start" className="skip-link">跳到主内容</a>

      <ErrorBoundary
        onReset={handleResetBoundary}
        onCapture={handleCapture}
        onRestore={handleRestore}
        recoveryStorageKey={RECOVERY_KEY}
      >
        {recoveryAvailable && (
          <div
            role="status"
            aria-live="polite"
            className="recovery-banner"
          >
            <div className="recovery-banner-inner">
              <span className="recovery-banner-icon" aria-hidden="true">💾</span>
              <div className="recovery-banner-body">
                <strong>检测到上次崩溃前的编辑数据</strong>
                <span>（
                  {new Date(recoveryAvailable.capturedAt).toLocaleString()}
                  {recoveryAvailable.errorMessage ? ` · ${recoveryAvailable.errorMessage}` : ''}
                  ）</span>
              </div>
              <div className="recovery-banner-actions" role="group" aria-label="恢复操作">
                <button
                  type="button"
                  className="rb-btn rb-btn-primary"
                  onClick={() => handleRestore(recoveryAvailable)}
                  aria-label="恢复上次崩溃前的表单字段和工作流节点"
                >
                  🔄 恢复数据
                </button>
                <button
                  type="button"
                  className="rb-btn rb-btn-outline"
                  onClick={handleDismissRecovery}
                  aria-label="忽略崩溃恢复快照并丢弃"
                >
                  ✕ 忽略
                </button>
              </div>
            </div>
          </div>
        )}

        <Toolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPreview={handlePreview}
          formFields={formFields}
          workflowNodes={workflowNodes}
          onValidate={handleValidate}
        />

        <div id="main-start" className="workspace">
          <ErrorBoundary
            title="左侧面板加载失败"
            subtitle="组件异常已隔离，您可以继续操作其他区域"
            showClearStorage={false}
          >
            {renderLeftPanel()}
          </ErrorBoundary>

          <ErrorBoundary
            title="主工作区加载失败"
            subtitle="请尝试重置或刷新以恢复"
            onReset={handleResetBoundary}
          >
            {renderCenterPanel()}
          </ErrorBoundary>

          <ErrorBoundary
            title="属性面板加载失败"
            subtitle="属性区域异常已隔离，不会影响整体使用"
            showClearStorage={false}
          >
            {renderRightPanel()}
          </ErrorBoundary>
        </div>

        <ErrorBoundary title="预览窗口异常">
          {showPreview && (
            <PreviewPanel
              formFields={formFields}
              workflowNodes={workflowNodes}
              onClose={() => setShowPreview(false)}
              validationErrors={validationErrors}
              onValidate={handleValidate}
              formData={previewFormData}
              setFormData={setPreviewFormData}
            />
          )}
        </ErrorBoundary>
      </ErrorBoundary>

      {isNarrowViewport && drawerOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          aria-hidden="true"
          onClick={() => setDrawerOpen(null)}
        />
      )}

      {showValidationToast && (
        <div
          className={`validation-toast ${showValidationToast.type}`}
          role="status"
          aria-live="polite"
          aria-label="校验结果"
        >
          <span>{showValidationToast.msg}</span>
        </div>
      )}
    </div>
  )
}

function getNodeColor(type) {
  const map = {
    [NODE_TYPES.START]: '#52c41a',
    [NODE_TYPES.APPROVAL]: '#1890ff',
    [NODE_TYPES.CONDITION]: '#faad14',
    [NODE_TYPES.CC]: '#722ed1',
    [NODE_TYPES.END]: '#f5222d',
  }
  return map[type] || '#1890ff'
}

function getNodeIcon(type) {
  const map = {
    [NODE_TYPES.START]: '▶️',
    [NODE_TYPES.APPROVAL]: '✅',
    [NODE_TYPES.CONDITION]: '🔀',
    [NODE_TYPES.CC]: '📧',
    [NODE_TYPES.END]: '⏹️',
  }
  return map[type] || '📦'
}

function getNodeLabel(type) {
  const map = {
    [NODE_TYPES.APPROVAL]: '审批节点',
    [NODE_TYPES.CONDITION]: '条件分支',
    [NODE_TYPES.CC]: '抄送节点',
  }
  return map[type] || '节点'
}

export default App
