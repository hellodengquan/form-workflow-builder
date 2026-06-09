import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateField, validateAllFields } from '../utils/validation'

describe('validation.js', () => {
  describe('validateField', () => {
    it('必填字段为空时返回错误', () => {
      const field = { id: 'f1', type: 'text', label: '姓名', required: true }
      const errors = validateField(field, '')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('必填'))).toBe(true)
    })

    it('必填字段有值时不返回必填错误', () => {
      const field = { id: 'f1', type: 'text', label: '姓名', required: true }
      const errors = validateField(field, '张三')
      expect(errors.some(e => e.includes('必填'))).toBe(false)
    })

    it('必填字段数组为空时返回错误', () => {
      const field = { id: 'f1', type: 'checkbox', label: '兴趣', required: true }
      const errors = validateField(field, [])
      expect(errors.length).toBeGreaterThan(0)
    })

    it('必填字段数组有值时通过', () => {
      const field = { id: 'f1', type: 'checkbox', label: '兴趣', required: true }
      const errors = validateField(field, ['阅读'])
      expect(errors.length).toBe(0)
    })

    it('数字字段非数字返回错误', () => {
      const field = { id: 'f1', type: 'number', label: '金额' }
      const errors = validateField(field, 'abc')
      expect(errors.some(e => e.includes('有效的数字'))).toBe(true)
    })

    it('数字字段小于最小值返回错误', () => {
      const field = { id: 'f1', type: 'number', label: '金额', min: 100 }
      const errors = validateField(field, 50)
      expect(errors.some(e => e.includes('不能小于'))).toBe(true)
    })

    it('数字字段大于最大值返回错误', () => {
      const field = { id: 'f1', type: 'number', label: '金额', max: 1000 }
      const errors = validateField(field, 2000)
      expect(errors.some(e => e.includes('不能大于'))).toBe(true)
    })

    it('数字字段必须为整数检查', () => {
      const field = { id: 'f1', type: 'number', label: '数量', integer: true }
      let errors = validateField(field, 3.14)
      expect(errors.some(e => e.includes('整数'))).toBe(true)
      errors = validateField(field, 10)
      expect(errors.some(e => e.includes('整数'))).toBe(false)
    })

    it('数字字段在范围内通过', () => {
      const field = { id: 'f1', type: 'number', label: '金额', min: 0, max: 1000 }
      const errors = validateField(field, 500)
      expect(errors.length).toBe(0)
    })

    it('日期字段早于最早日期返回错误', () => {
      const field = { id: 'f1', type: 'date', label: '出发', minDate: '2026-01-01' }
      const errors = validateField(field, '2025-01-01')
      expect(errors.some(e => e.includes('早于'))).toBe(true)
    })

    it('日期字段晚于最晚日期返回错误', () => {
      const field = { id: 'f1', type: 'date', label: '出发', maxDate: '2026-12-31' }
      const errors = validateField(field, '2027-01-01')
      expect(errors.some(e => e.includes('晚于'))).toBe(true)
    })

    it('日期字段在范围内通过', () => {
      const field = { id: 'f1', type: 'date', label: '出发', minDate: '2026-01-01', maxDate: '2026-12-31' }
      const errors = validateField(field, '2026-06-01')
      expect(errors.length).toBe(0)
    })

    it('文本字段长度小于最小值返回错误', () => {
      const field = { id: 'f1', type: 'text', label: '密码', minLength: 6 }
      const errors = validateField(field, 'abc')
      expect(errors.some(e => e.includes('最少'))).toBe(true)
    })

    it('文本字段长度大于最大值返回错误', () => {
      const field = { id: 'f1', type: 'text', label: '名称', maxLength: 10 }
      const errors = validateField(field, 'a'.repeat(15))
      expect(errors.some(e => e.includes('最多'))).toBe(true)
    })

    it('文本字段邮箱格式验证', () => {
      const field = { id: 'f1', type: 'text', label: '邮箱', fieldType: 'email' }
      let errors = validateField(field, 'not-email')
      expect(errors.some(e => e.includes('邮箱'))).toBe(true)
      errors = validateField(field, 'test@example.com')
      expect(errors.some(e => e.includes('邮箱'))).toBe(false)
    })

    it('文本字段手机号格式验证', () => {
      const field = { id: 'f1', type: 'text', label: '手机', fieldType: 'phone' }
      let errors = validateField(field, '12345')
      expect(errors.some(e => e.includes('手机'))).toBe(true)
      errors = validateField(field, '13800138000')
      expect(errors.length).toBe(0)
    })

    it('自定义正则表达式验证', () => {
      const field = {
        id: 'f1', type: 'text', label: '编码',
        pattern: '^[A-Z0-9]+$', patternHint: '仅大写字母和数字'
      }
      let errors = validateField(field, 'abc')
      expect(errors.some(e => e.includes('仅大写字母和数字'))).toBe(true)
      errors = validateField(field, 'ABC123')
      expect(errors.length).toBe(0)
    })
  })

  describe('validateAllFields', () => {
    it('全部通过时返回 valid=true', () => {
      const fields = [
        { id: 'f1', type: 'text', label: '姓名', required: true },
        { id: 'f2', type: 'number', label: '金额', required: false }
      ]
      const formData = { f1: '张三', f2: 100 }
      const result = validateAllFields(fields, formData)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })

    it('有错误时返回 valid=false 和错误映射', () => {
      const fields = [
        { id: 'f1', type: 'text', label: '姓名', required: true },
        { id: 'f2', type: 'text', label: '邮箱', required: true, fieldType: 'email' }
      ]
      const formData = { f1: '', f2: 'bad' }
      const result = validateAllFields(fields, formData)
      expect(result.valid).toBe(false)
      expect(result.errors.f1).toBeDefined()
      expect(result.errors.f2).toBeDefined()
    })
  })
})
