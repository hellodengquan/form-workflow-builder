export const FIELD_TYPES = [
  { type: 'text', label: '单行文本', icon: '📝', defaultLabel: '文本输入' },
  { type: 'textarea', label: '多行文本', icon: '📄', defaultLabel: '详细描述' },
  { type: 'number', label: '数字', icon: '🔢', defaultLabel: '数量' },
  { type: 'select', label: '下拉选择', icon: '📋', defaultLabel: '选择项' },
  { type: 'radio', label: '单选框', icon: '⚪', defaultLabel: '单选组' },
  { type: 'checkbox', label: '多选框', icon: '☑️', defaultLabel: '多选组' },
  { type: 'date', label: '日期选择', icon: '📅', defaultLabel: '日期' },
  { type: 'file', label: '附件上传', icon: '📎', defaultLabel: '上传文件' },
  { type: 'user', label: '人员选择', icon: '👤', defaultLabel: '选择人员' },
  { type: 'dept', label: '部门选择', icon: '🏢', defaultLabel: '选择部门' },
]

export const NODE_TYPES = {
  START: 'start',
  APPROVAL: 'approval',
  CONDITION: 'condition',
  CC: 'cc',
  END: 'end',
}

export const NODE_DEFS = {
  [NODE_TYPES.START]: { label: '开始节点', color: '#52c41a', icon: '▶️' },
  [NODE_TYPES.APPROVAL]: { label: '审批节点', color: '#1890ff', icon: '✅' },
  [NODE_TYPES.CONDITION]: { label: '条件分支', color: '#faad14', icon: '🔀' },
  [NODE_TYPES.CC]: { label: '抄送节点', color: '#722ed1', icon: '📧' },
  [NODE_TYPES.END]: { label: '结束节点', color: '#f5222d', icon: '⏹️' },
}

export const generateId = () => Math.random().toString(36).substring(2, 11)
