export const SCHEMA_VERSION = 2

export const RECOVERY_EXPIRY_MS = 1000 * 60 * 60 * 24 // 24 小时

const VALID_ACTIVE_TABS = ['form', 'workflow']
const VALID_FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'radio', 'checkbox', 'date', 'file', 'user', 'dept']
const VALID_NODE_TYPES = ['start', 'approval', 'condition', 'cc', 'end']

const DEFAULT_SNAPSHOT = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  capturedAt: 0,
  errorMessage: '',
  activeTab: 'form',
  formFields: Object.freeze([]),
  workflowNodes: Object.freeze([]),
  selectedFieldId: null,
  selectedNodeId: null,
  previewFormData: Object.freeze({}),
  meta: Object.freeze({
    warnings: Object.freeze([]),
    restoredFromVersion: null,
  }),
})

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isValidFormField(v) {
  if (!isPlainObject(v)) return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (!VALID_FIELD_TYPES.includes(v.type)) return false
  if (typeof v.label !== 'string') return false
  return true
}

function isValidWorkflowNode(v) {
  if (!isPlainObject(v)) return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (!VALID_NODE_TYPES.includes(v.type)) return false
  if (typeof v.name !== 'string') return false
  const xNum = Number(v.x)
  const yNum = Number(v.y)
  if (!Number.isFinite(xNum)) return false
  if (!Number.isFinite(yNum)) return false
  return true
}

export function validateSnapshot(raw, options = {}) {
  const warnings = []
  const { now = Date.now(), schemaVersionCurrent = SCHEMA_VERSION } = options

  if (raw === null || raw === undefined) {
    warnings.push('快照为空，使用默认值')
    return {
      valid: false,
      warnings,
      sanitized: {
        ...DEFAULT_SNAPSHOT,
        capturedAt: now,
        meta: { ...DEFAULT_SNAPSHOT.meta, warnings },
      },
    }
  }

  let input
  try {
    input = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (err) {
    warnings.push(`快照 JSON 解析失败：${err.message}`)
    return {
      valid: false,
      warnings,
      sanitized: {
        ...DEFAULT_SNAPSHOT,
        capturedAt: now,
        meta: { ...DEFAULT_SNAPSHOT.meta, warnings },
      },
    }
  }

  if (!isPlainObject(input)) {
    warnings.push('快照根不是对象')
    return {
      valid: false,
      warnings,
      sanitized: {
        ...DEFAULT_SNAPSHOT,
        capturedAt: now,
        meta: { ...DEFAULT_SNAPSHOT.meta, warnings },
      },
    }
  }

  const restoredFromVersion =
    typeof input.schemaVersion === 'number' ? input.schemaVersion : null
  if (restoredFromVersion === null) {
    warnings.push('快照缺少 schemaVersion，视为 v1 旧版本')
  } else if (restoredFromVersion < schemaVersionCurrent) {
    warnings.push(
      `快照 schemaVersion=${restoredFromVersion} 落后当前 ${schemaVersionCurrent}，将使用默认值补齐缺失字段`
    )
  } else if (restoredFromVersion > schemaVersionCurrent) {
    warnings.push(
      `快照 schemaVersion=${restoredFromVersion} 超前当前 ${schemaVersionCurrent}，使用保守策略还原`
    )
  }

  // capturedAt 校验
  let capturedAt = typeof input.capturedAt === 'number' ? input.capturedAt : 0
  if (capturedAt <= 0) {
    warnings.push('capturedAt 无效，已重置为当前时间')
    capturedAt = now
  }

  // errorMessage
  let errorMessage = DEFAULT_SNAPSHOT.errorMessage
  if (typeof input.errorMessage === 'string') {
    errorMessage = input.errorMessage
  } else if (input.errorMessage != null) {
    warnings.push('errorMessage 不是字符串，已丢弃')
  }

  // activeTab
  let activeTab = DEFAULT_SNAPSHOT.activeTab
  if (VALID_ACTIVE_TABS.includes(input.activeTab)) {
    activeTab = input.activeTab
  } else if (input.activeTab != null) {
    warnings.push(`activeTab 无效：${String(input.activeTab)}，回退到 'form'`)
  }

  // formFields：数组 + 元素 shape 过滤
  let formFields = []
  if (Array.isArray(input.formFields)) {
    let invalidFieldCount = 0
    for (const f of input.formFields) {
      if (isValidFormField(f)) {
        formFields.push({
          id: String(f.id),
          type: f.type,
          label: String(f.label),
          placeholder: typeof f.placeholder === 'string' ? f.placeholder : '',
          required: Boolean(f.required),
          unit: typeof f.unit === 'string' ? f.unit : undefined,
          options: Array.isArray(f.options)
            ? f.options.filter(o => typeof o === 'string')
            : undefined,
          min: typeof f.min === 'number' && !Number.isNaN(f.min) ? f.min : undefined,
          max: typeof f.max === 'number' && !Number.isNaN(f.max) ? f.max : undefined,
          pattern: typeof f.pattern === 'string' ? f.pattern : undefined,
        })
      } else {
        invalidFieldCount += 1
      }
    }
    if (invalidFieldCount > 0) {
      warnings.push(`过滤了 ${invalidFieldCount} 个结构无效的表单字段`)
    }
  } else if (input.formFields != null) {
    warnings.push('formFields 不是数组，已置空')
  }

  // workflowNodes：数组 + 元素 shape 过滤
  let workflowNodes = []
  if (Array.isArray(input.workflowNodes)) {
    let invalidNodeCount = 0
    for (const n of input.workflowNodes) {
      if (isValidWorkflowNode(n)) {
        workflowNodes.push({
          id: String(n.id),
          type: n.type,
          name: String(n.name),
          approver: typeof n.approver === 'string' ? n.approver : '未配置',
          x: Number(n.x),
          y: Number(n.y),
          condition: typeof n.condition === 'string' ? n.condition : undefined,
        })
      } else {
        invalidNodeCount += 1
      }
    }
    if (invalidNodeCount > 0) {
      warnings.push(`过滤了 ${invalidNodeCount} 个结构无效的流程节点`)
    }
  } else if (input.workflowNodes != null) {
    warnings.push('workflowNodes 不是数组，已置空')
  }

  // selectedFieldId / selectedNodeId：要么 null 要么非空字符串
  let selectedFieldId = null
  if (typeof input.selectedFieldId === 'string' && input.selectedFieldId.length > 0) {
    const exists = formFields.some(f => f.id === input.selectedFieldId)
    if (exists) {
      selectedFieldId = input.selectedFieldId
    } else {
      warnings.push(`selectedFieldId="${input.selectedFieldId}" 在恢复的表单字段中找不到，置空`)
    }
  } else if (input.selectedFieldId != null && input.selectedFieldId !== undefined) {
    warnings.push('selectedFieldId 类型无效，置空')
  }

  let selectedNodeId = null
  if (typeof input.selectedNodeId === 'string' && input.selectedNodeId.length > 0) {
    const exists = workflowNodes.some(n => n.id === input.selectedNodeId)
    if (exists) {
      selectedNodeId = input.selectedNodeId
    } else {
      warnings.push(`selectedNodeId="${input.selectedNodeId}" 在恢复的节点中找不到，置空`)
    }
  } else if (input.selectedNodeId != null && input.selectedNodeId !== undefined) {
    warnings.push('selectedNodeId 类型无效，置空')
  }

  // previewFormData：plain object，值类型仅保留原始类型
  let previewFormData = {}
  if (isPlainObject(input.previewFormData)) {
    for (const [k, v] of Object.entries(input.previewFormData)) {
      const isPrimitive =
        v === null ||
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      const isPrimitiveArr =
        Array.isArray(v) && v.every(x => x === null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')
      if (isPrimitive) {
        previewFormData[k] = v
      } else if (isPrimitiveArr) {
        previewFormData[k] = v.slice()
      } else {
        warnings.push(`previewFormData["${k}"] 含非原始类型，已丢弃`)
      }
    }
  } else if (input.previewFormData != null) {
    warnings.push('previewFormData 不是纯对象，已置空')
  }

  const sanitized = {
    schemaVersion: schemaVersionCurrent,
    capturedAt,
    errorMessage,
    activeTab,
    formFields,
    workflowNodes,
    selectedFieldId,
    selectedNodeId,
    previewFormData,
    meta: {
      warnings: Object.freeze(warnings.slice()),
      restoredFromVersion,
    },
  }

  // 只要字段列表非空就算 valid（即使有警告，说明恢复出有用内容）
  const valid =
    warnings.length === 0 ||
    formFields.length > 0 ||
    workflowNodes.length > 0

  return { valid, warnings, sanitized }
}

export function isSnapshotExpired(snapshot, options = {}) {
  const {
    now = Date.now(),
    expiryMs = RECOVERY_EXPIRY_MS,
  } = options
  if (!snapshot || typeof snapshot.capturedAt !== 'number') return true
  const age = now - snapshot.capturedAt
  if (age < 0) return false
  return age > expiryMs
}
