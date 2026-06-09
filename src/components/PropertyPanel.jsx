import { FIELD_TYPES, NODE_TYPES } from '../utils/constants'

export default function PropertyPanel({
  activeTab,
  selectedField,
  selectedNode,
  onUpdateField,
  onUpdateNode,
}) {
  if (activeTab === 'form') {
    if (!selectedField) {
      return (
        <div className="property-panel empty">
          <div className="pp-empty">
            <div className="ppe-icon">🎯</div>
            <h3>选择字段查看属性</h3>
            <p>点击表单中的任意字段，在此处编辑其详细配置</p>
          </div>
        </div>
      )
    }
    return <FieldProperty field={selectedField} onUpdate={onUpdateField} />
  }

  if (activeTab === 'workflow') {
    if (!selectedNode) {
      return (
        <div className="property-panel empty">
          <div className="pp-empty">
            <div className="ppe-icon">🎯</div>
            <h3>选择节点查看属性</h3>
            <p>点击流程图中的任意节点，在此处编辑节点配置</p>
          </div>
        </div>
      )
    }
    return <NodeProperty node={selectedNode} onUpdate={onUpdateNode} />
  }

  return null
}

function FieldProperty({ field, onUpdate }) {
  const fieldDef = FIELD_TYPES.find(f => f.type === field.type)
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type)

  const addOption = () => {
    const options = [...(field.options || []), `选项${(field.options?.length || 0) + 1}`]
    onUpdate(field.id, { options })
  }

  const updateOption = (index, value) => {
    const options = [...(field.options || [])]
    options[index] = value
    onUpdate(field.id, { options })
  }

  const removeOption = (index) => {
    const options = (field.options || []).filter((_, i) => i !== index)
    onUpdate(field.id, { options })
  }

  return (
    <div className="property-panel">
      <div className="pp-header">
        <div className="pph-icon" style={{ background: getTypeColor(field.type) }}>
          {fieldDef?.icon}
        </div>
        <div className="pph-info">
          <h3>{fieldDef?.label}</h3>
          <span className="pph-id">ID: {field.id}</span>
        </div>
      </div>

      <div className="pp-section">
        <h4 className="pp-section-title">基础配置</h4>
        <div className="pp-form">
          <div className="form-row">
            <label>字段标签</label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>占位提示</label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label className="switch-label">
              <span>是否必填</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          {field.type === 'number' && (
            <div className="form-row">
              <label>单位</label>
              <input
                type="text"
                value={field.unit || ''}
                placeholder="如：元、个、次"
                onChange={(e) => onUpdate(field.id, { unit: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>

      {hasOptions && (
        <div className="pp-section">
          <div className="pp-section-header">
            <h4 className="pp-section-title">选项配置</h4>
            <button className="link-btn" onClick={addOption}>+ 添加选项</button>
          </div>
          <div className="option-list">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="option-item">
                <span className="opt-drag">⋮⋮</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                <button
                  className="opt-delete"
                  onClick={() => removeOption(i)}
                  disabled={(field.options?.length || 0) <= 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pp-section">
        <h4 className="pp-section-title">校验规则</h4>
        <div className="pp-form">
          {field.type === 'number' && (
            <>
              <div className="form-row">
                <label>最小值</label>
                <input
                  type="number"
                  value={field.min !== undefined && field.min !== '' ? field.min : ''}
                  placeholder="例如：0"
                  onChange={(e) => onUpdate(field.id, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>最大值</label>
                <input
                  type="number"
                  value={field.max !== undefined && field.max !== '' ? field.max : ''}
                  placeholder="例如：999999"
                  onChange={(e) => onUpdate(field.id, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label className="switch-label">
                  <span>必须为整数</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={!!field.integer}
                      onChange={(e) => onUpdate(field.id, { integer: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>
            </>
          )}

          {field.type === 'date' && (
            <>
              <div className="form-row">
                <label>最早日期</label>
                <input
                  type="date"
                  value={field.minDate || ''}
                  onChange={(e) => onUpdate(field.id, { minDate: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>最晚日期</label>
                <input
                  type="date"
                  value={field.maxDate || ''}
                  onChange={(e) => onUpdate(field.id, { maxDate: e.target.value })}
                />
              </div>
            </>
          )}

          {(field.type === 'text' || field.type === 'textarea') && (
            <>
              <div className="form-row">
                <label>最小字符长度</label>
                <input
                  type="number"
                  min="0"
                  value={field.minLength !== undefined && field.minLength !== '' ? field.minLength : ''}
                  placeholder="0"
                  onChange={(e) => onUpdate(field.id, { minLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>最大字符长度</label>
                <input
                  type="number"
                  min="0"
                  value={field.maxLength !== undefined && field.maxLength !== '' ? field.maxLength : ''}
                  placeholder="例如：100"
                  onChange={(e) => onUpdate(field.id, { maxLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              {field.type === 'text' && (
                <>
                  <div className="form-row">
                    <label>内容格式类型</label>
                    <select
                      value={field.fieldType || 'text'}
                      onChange={(e) => onUpdate(field.id, { fieldType: e.target.value })}
                    >
                      <option value="text">普通文本</option>
                      <option value="email">邮箱地址</option>
                      <option value="phone">手机号码</option>
                      <option value="url">网址URL</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>自定义正则表达式</label>
                    <input
                      type="text"
                      value={field.pattern || ''}
                      placeholder="例如：^[A-Za-z0-9]+$"
                      onChange={(e) => onUpdate(field.id, { pattern: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label>正则不匹配提示</label>
                    <input
                      type="text"
                      value={field.patternHint || ''}
                      placeholder="格式不正确"
                      onChange={(e) => onUpdate(field.id, { patternHint: e.target.value })}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="pp-section">
        <h4 className="pp-section-title">高级配置</h4>
        <div className="pp-form">
          <div className="form-row">
            <label>默认值</label>
            <input
              type="text"
              value={field.defaultValue || ''}
              placeholder="可留空"
              onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>帮助说明</label>
            <textarea
              rows={2}
              value={field.helpText || ''}
              placeholder="显示在字段下方的提示文字"
              onChange={(e) => onUpdate(field.id, { helpText: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function NodeProperty({ node, onUpdate }) {
  const isStart = node.type === NODE_TYPES.START
  const isEnd = node.type === NODE_TYPES.END

  return (
    <div className="property-panel">
      <div className="pp-header">
        <div className="pph-icon" style={{ background: getNodeColor(node.type) }}>
          {getNodeIcon(node.type)}
        </div>
        <div className="pph-info">
          <h3>{getNodeTypeName(node.type)}</h3>
          <span className="pph-id">ID: {node.id}</span>
        </div>
      </div>

      <div className="pp-section">
        <h4 className="pp-section-title">节点配置</h4>
        <div className="pp-form">
          <div className="form-row">
            <label>节点名称</label>
            <input
              type="text"
              value={node.name}
              onChange={(e) => onUpdate(node.id, { name: e.target.value })}
              disabled={isStart || isEnd}
            />
          </div>

          {!isEnd && (
            <div className="form-row">
              <label>处理方</label>
              <div className="approver-select">
                <span className="as-icon">👤</span>
                <input
                  type="text"
                  value={node.approver}
                  onChange={(e) => onUpdate(node.id, { approver: e.target.value })}
                  disabled={isStart}
                />
                <button className="as-btn" disabled={isStart}>选择</button>
              </div>
            </div>
          )}

          {node.type === NODE_TYPES.APPROVAL && (
            <>
              <div className="form-row">
                <label>审批方式</label>
                <select
                  value={node.approveType || 'sequential'}
                  onChange={(e) => onUpdate(node.id, { approveType: e.target.value })}
                >
                  <option value="sequential">依次审批（按顺序）</option>
                  <option value="parallel">会签（同时审批）</option>
                  <option value="or">或签（一人通过即可）</option>
                </select>
              </div>

              <div className="form-row">
                <label>超时处理</label>
                <select
                  value={node.timeout || 'none'}
                  onChange={(e) => onUpdate(node.id, { timeout: e.target.value })}
                >
                  <option value="none">不处理</option>
                  <option value="auto-pass">超时自动通过</option>
                  <option value="auto-reject">超时自动驳回</option>
                  <option value="notify">超时仅提醒</option>
                </select>
              </div>

              <div className="form-row">
                <label className="switch-label">
                  <span>允许加签</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={node.allowAddSign !== false}
                      onChange={(e) => onUpdate(node.id, { allowAddSign: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>

              <div className="form-row">
                <label className="switch-label">
                  <span>允许退回</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={node.allowReturn !== false}
                      onChange={(e) => onUpdate(node.id, { allowReturn: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>
            </>
          )}

          {node.type === NODE_TYPES.CC && (
            <div className="form-row">
              <label className="switch-label">
                <span>允许回复</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={node.allowReply}
                    onChange={(e) => onUpdate(node.id, { allowReply: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="pp-section">
        <h4 className="pp-section-title">表单权限</h4>
        <div className="permission-table">
          <div className="pt-header">
            <span>字段</span>
            <span>可见</span>
            <span>可编辑</span>
          </div>
          {['申请标题', '申请说明', '申请金额'].map((name, i) => (
            <div key={i} className="pt-row">
              <span className="pt-field">{name}</span>
              <span className="pt-check">
                <input type="checkbox" defaultChecked />
              </span>
              <span className="pt-check">
                <input type="checkbox" defaultChecked={!isEnd && i < 2} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getTypeColor(type) {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96']
  const index = type.length % colors.length
  return colors[index]
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

function getNodeTypeName(type) {
  const map = {
    [NODE_TYPES.START]: '开始节点',
    [NODE_TYPES.APPROVAL]: '审批节点',
    [NODE_TYPES.CONDITION]: '条件分支',
    [NODE_TYPES.CC]: '抄送节点',
    [NODE_TYPES.END]: '结束节点',
  }
  return map[type] || '节点'
}
