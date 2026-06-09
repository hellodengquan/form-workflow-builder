import { useState, useCallback, useMemo } from 'react'
import FieldLibrary from './components/FieldLibrary'
import FormDesigner from './components/FormDesigner'
import WorkflowDesigner from './components/WorkflowDesigner'
import PreviewPanel from './components/PreviewPanel'
import PropertyPanel from './components/PropertyPanel'
import Toolbar from './components/Toolbar'
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
  }, [setFormFields])

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

  return (
    <div className="app-container">
      <Toolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPreview={handlePreview}
        formFields={formFields}
        workflowNodes={workflowNodes}
        onValidate={handleValidate}
      />

      <div className="workspace">
        <aside className="left-panel">
          {activeTab === 'form' && (
            <FieldLibrary onAddField={addField} />
          )}
          {activeTab === 'workflow' && (
            <div className="node-library">
              <h3 className="panel-title">节点库</h3>
              <div className="node-lib-list">
                {[NODE_TYPES.APPROVAL, NODE_TYPES.CONDITION, NODE_TYPES.CC].map(type => (
                  <div key={type} className="node-lib-item">
                    <span className="node-lib-icon" style={{ background: getNodeColor(type) }}>
                      {getNodeIcon(type)}
                    </span>
                    <span className="node-lib-label">{getNodeLabel(type)}</span>
                    <button
                      className="node-add-btn"
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

        <main className="center-panel">
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

        <aside className="right-panel">
          <PropertyPanel
            activeTab={activeTab}
            selectedField={selectedField}
            selectedNode={selectedNode}
            onUpdateField={updateField}
            onUpdateNode={updateNode}
          />
        </aside>
      </div>

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

      {showValidationToast && (
        <div className={`validation-toast ${showValidationToast.type}`}>
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
