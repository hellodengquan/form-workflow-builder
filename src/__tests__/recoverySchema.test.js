import { describe, it, expect, beforeEach } from 'vitest'
import {
  SCHEMA_VERSION,
  RECOVERY_EXPIRY_MS,
  validateSnapshot,
  isSnapshotExpired,
} from '../utils/recoverySchema'

const BASE_FIELDS = Object.freeze([
  { id: 'f1', type: 'text', label: '申请标题', placeholder: '请输入', required: true },
  { id: 'f2', type: 'number', label: '金额', unit: '元' },
])

const BASE_NODES = Object.freeze([
  { id: 'start-1', type: 'start', name: '开始', x: 320, y: 40, approver: '申请人' },
  { id: 'approval-1', type: 'approval', name: '主管审批', x: 320, y: 160, approver: '主管' },
  { id: 'end-1', type: 'end', name: '结束', x: 320, y: 280, approver: '系统' },
])

function makeGood(overrides = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    capturedAt: Date.now(),
    errorMessage: '测试崩溃',
    activeTab: 'form',
    formFields: JSON.parse(JSON.stringify(BASE_FIELDS)),
    workflowNodes: JSON.parse(JSON.stringify(BASE_NODES)),
    selectedFieldId: 'f1',
    selectedNodeId: null,
    previewFormData: { f1: '测试标题', f2: 100 },
    ...overrides,
  }
}

describe('recoverySchema 常量', () => {
  it('SCHEMA_VERSION 是正整数', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true)
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
  })

  it('RECOVERY_EXPIRY_MS = 24 小时（毫秒）', () => {
    expect(RECOVERY_EXPIRY_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('validateSnapshot', () => {
  it('快照为 null/undefined 时返回默认空快照 + 警告', () => {
    const r1 = validateSnapshot(null)
    expect(r1.valid).toBe(false)
    expect(r1.sanitized.formFields).toEqual([])
    expect(r1.sanitized.workflowNodes).toEqual([])
    expect(r1.sanitized.activeTab).toBe('form')
    expect(r1.warnings.length).toBeGreaterThan(0)

    const r2 = validateSnapshot(undefined)
    expect(r2.valid).toBe(false)
    expect(typeof r2.sanitized.capturedAt).toBe('number')
  })

  it('损坏的 JSON 字符串返回默认快照', () => {
    const r = validateSnapshot('{not valid json}')
    expect(r.valid).toBe(false)
    expect(r.warnings.some(w => /解析失败/.test(w))).toBe(true)
    expect(r.sanitized.formFields).toEqual([])
  })

  it('根节点非对象返回默认快照', () => {
    const r = validateSnapshot('["我是数组不是对象"]')
    expect(r.valid).toBe(false)
    expect(r.warnings.some(w => /根不是对象/.test(w))).toBe(true)
  })

  it('完全合法的快照通过校验，valid=true，无警告', () => {
    const snap = makeGood()
    const r = validateSnapshot(snap)
    expect(r.valid).toBe(true)
    expect(r.warnings).toEqual([])
    expect(r.sanitized.formFields).toHaveLength(BASE_FIELDS.length)
    expect(r.sanitized.workflowNodes).toHaveLength(BASE_NODES.length)
    expect(r.sanitized.selectedFieldId).toBe('f1')
    expect(r.sanitized.previewFormData.f1).toBe('测试标题')
    expect(r.sanitized.schemaVersion).toBe(SCHEMA_VERSION)
    expect(r.sanitized.meta.restoredFromVersion).toBe(SCHEMA_VERSION)
  })

  it('schemaVersion 缺失（视为 v1 旧版本），补默认值并记录警告', () => {
    const snap = makeGood()
    delete snap.schemaVersion
    // 旧版本可能还少了一些字段（模拟 v1 没有 previewFormData）
    delete snap.previewFormData

    const r = validateSnapshot(snap)
    expect(r.valid).toBe(true)
    expect(r.warnings.some(w => /v1 旧版本/.test(w))).toBe(true)
    expect(r.sanitized.schemaVersion).toBe(SCHEMA_VERSION)
    expect(r.sanitized.meta.restoredFromVersion).toBe(null)
    expect(r.sanitized.previewFormData).toEqual({})
  })

  it('schemaVersion 落后当前版本（v1 < v2），补齐缺失字段并标记', () => {
    const snap = makeGood({ schemaVersion: SCHEMA_VERSION - 1 })
    // 模拟旧版本没有一些字段
    delete snap.activeTab

    const r = validateSnapshot(snap)
    expect(r.valid).toBe(true)
    expect(r.warnings.some(w => new RegExp(`schemaVersion=${SCHEMA_VERSION - 1}.*落后当前 ${SCHEMA_VERSION}`).test(w))).toBe(true)
    expect(r.sanitized.activeTab).toBe('form') // 默认值
    expect(r.sanitized.meta.restoredFromVersion).toBe(SCHEMA_VERSION - 1)
  })

  it('schemaVersion 超前（新版本快照），保守处理并警告', () => {
    const snap = makeGood({ schemaVersion: SCHEMA_VERSION + 3 })
    const r = validateSnapshot(snap)
    expect(r.valid).toBe(true)
    expect(r.warnings.some(w => /超前/.test(w))).toBe(true)
  })

  describe('字段缺失（默认值补齐）', () => {
    it('capturedAt 非法时重写为当前时间', () => {
      const snap = makeGood({ capturedAt: 'not-a-number' })
      const r = validateSnapshot(snap, { now: 1234567890000 })
      expect(r.sanitized.capturedAt).toBe(1234567890000)
      expect(r.warnings.some(w => /capturedAt 无效/.test(w))).toBe(true)
    })

    it('formFields 缺失时置空数组', () => {
      const snap = makeGood()
      delete snap.formFields
      const r = validateSnapshot(snap)
      expect(r.sanitized.formFields).toEqual([])
    })

    it('formFields 非数组时警告+置空', () => {
      const r = validateSnapshot(makeGood({ formFields: '不是数组' }))
      expect(r.sanitized.formFields).toEqual([])
      expect(r.warnings.some(w => /formFields 不是数组/.test(w))).toBe(true)
    })

    it('workflowNodes 缺失时置空数组', () => {
      const snap = makeGood()
      delete snap.workflowNodes
      const r = validateSnapshot(snap)
      expect(r.sanitized.workflowNodes).toEqual([])
    })

    it('selectedFieldId/selectedNodeId 缺失置 null', () => {
      const snap = makeGood()
      delete snap.selectedFieldId
      delete snap.selectedNodeId
      const r = validateSnapshot(snap)
      expect(r.sanitized.selectedFieldId).toBe(null)
      expect(r.sanitized.selectedNodeId).toBe(null)
    })

    it('activeTab 非法时回退到 form', () => {
      const r = validateSnapshot(makeGood({ activeTab: 'invalid-mode' }))
      expect(r.sanitized.activeTab).toBe('form')
      expect(r.warnings.some(w => /activeTab 无效/.test(w))).toBe(true)
    })
  })

  describe('类型错误（过滤/强制转换）', () => {
    it('表单字段中存在非法项：过滤并计数', () => {
      const badFields = [
        { id: 'f1', type: 'text', label: '合法字段' },
        { id: '', type: 'text', label: '空 id 被过滤' }, // 非法
        { id: 'f3', type: 'unknown-type', label: '类型非法' }, // 非法
        { notAnObject: true }, // 非法
      ]
      const r = validateSnapshot(makeGood({ formFields: badFields, selectedFieldId: 'f1' }))
      expect(r.sanitized.formFields).toHaveLength(1)
      expect(r.sanitized.formFields[0].id).toBe('f1')
      expect(r.warnings.some(w => /过滤了 3 个结构无效的表单字段/.test(w))).toBe(true)
      expect(r.sanitized.selectedFieldId).toBe('f1')
    })

    it('流程节点中存在非法项：过滤并计数，selectedNodeId 指向被过滤的节点则置空', () => {
      const badNodes = [
        { id: 'n1', type: 'approval', name: '合法节点', x: 100, y: 100 },
        { id: 'n2', type: 'nonexist', name: '非法类型', x: 0, y: 0 }, // 非法
        { id: 'n3', type: 'start', name: '缺坐标', name2: 'foo' }, // 缺 x/y，非法
      ]
      const r = validateSnapshot(makeGood({
        workflowNodes: badNodes,
        selectedNodeId: 'n2', // 指向被过滤的节点
      }))
      expect(r.sanitized.workflowNodes).toHaveLength(1)
      expect(r.sanitized.workflowNodes[0].id).toBe('n1')
      expect(r.warnings.some(w => /过滤了 2 个结构无效的流程节点/.test(w))).toBe(true)
      expect(r.sanitized.selectedNodeId).toBe(null)
      expect(r.warnings.some(w => /selectedNodeId="n2" 在恢复的节点中找不到/.test(w))).toBe(true)
    })

    it('表单字段 options 非字符串数组：过滤非字符串项', () => {
      const r = validateSnapshot(makeGood({
        formFields: [{ id: 'f1', type: 'select', label: '选项', options: ['A', 123, null, 'B'] }],
      }))
      expect(r.sanitized.formFields[0].options).toEqual(['A', 'B'])
    })

    it('previewFormData 非原始类型字段被丢弃', () => {
      const r = validateSnapshot(makeGood({
        previewFormData: {
          a: 'ok',
          b: 42,
          c: true,
          d: null,
          e: ['x', 1], // 原始数组，保留
          f: { nested: '被丢弃' }, // 对象，丢弃
          g: () => '函数丢弃', // 函数，丢弃
        },
      }))
      const pfd = r.sanitized.previewFormData
      expect(pfd.a).toBe('ok')
      expect(pfd.b).toBe(42)
      expect(pfd.c).toBe(true)
      expect(pfd.d).toBe(null)
      expect(pfd.e).toEqual(['x', 1])
      expect('f' in pfd).toBe(false)
      expect('g' in pfd).toBe(false)
      expect(r.warnings.some(w => /previewFormData\["f"\]/.test(w))).toBe(true)
      expect(r.warnings.some(w => /previewFormData\["g"\]/.test(w))).toBe(true)
    })

    it('节点坐标是字符串时被强制转 number', () => {
      const r = validateSnapshot(makeGood({
        workflowNodes: [{ id: 'n1', type: 'start', name: '开始', x: '320', y: '40', approver: '申请人' }],
      }))
      expect(typeof r.sanitized.workflowNodes[0].x).toBe('number')
      expect(r.sanitized.workflowNodes[0].x).toBe(320)
      expect(typeof r.sanitized.workflowNodes[0].y).toBe('number')
      expect(r.sanitized.workflowNodes[0].y).toBe(40)
    })

    it('required 字段强制转 boolean', () => {
      const r = validateSnapshot(makeGood({
        formFields: [{ id: 'f1', type: 'text', label: '标题', required: 'truthy-string' }],
      }))
      expect(r.sanitized.formFields[0].required).toBe(true)
    })
  })

  describe('字符串输入支持（从 localStorage 直接读的原始字符串）', () => {
    it('JSON 字符串可以直接传入 validateSnapshot', () => {
      const raw = JSON.stringify(makeGood())
      const r = validateSnapshot(raw)
      expect(r.valid).toBe(true)
      expect(r.sanitized.formFields).toHaveLength(BASE_FIELDS.length)
    })
  })
})

describe('isSnapshotExpired', () => {
  it('未到 24h 返回 false', () => {
    const snap = { capturedAt: Date.now() - 1000 * 60 * 60 } // 1 小时前
    expect(isSnapshotExpired(snap)).toBe(false)
  })

  it('超过 24h 返回 true', () => {
    const snap = { capturedAt: Date.now() - (RECOVERY_EXPIRY_MS + 1000) }
    expect(isSnapshotExpired(snap)).toBe(true)
  })

  it('过期阈值可通过 expiryMs 参数自定义（10 分钟阈值）', () => {
    const snap = { capturedAt: Date.now() - 1000 * 60 * 11 } // 11 分钟前
    // 10 分钟阈值 => 过期
    expect(isSnapshotExpired(snap, { expiryMs: 1000 * 60 * 10 })).toBe(true)
    // 2 小时阈值 => 未过期
    expect(isSnapshotExpired(snap, { expiryMs: 1000 * 60 * 60 * 2 })).toBe(false)
  })

  it('capturedAt 缺省返回 true（视为已过期）', () => {
    expect(isSnapshotExpired({})).toBe(true)
    expect(isSnapshotExpired(null)).toBe(true)
  })

  it('未来时间戳（时钟回拨保护）返回 false（不过期）', () => {
    const snap = { capturedAt: Date.now() + 1000 * 60 * 60 }
    expect(isSnapshotExpired(snap)).toBe(false)
  })
})
