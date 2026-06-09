export function validateField(field, value) {
  const errors = []

  if (field.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    if (isEmpty) {
      errors.push(`${field.label || '该字段'}为必填项`)
    }
  }

  if (field.type === 'number' && value !== '' && value !== undefined && value !== null) {
    const num = Number(value)
    if (isNaN(num)) {
      errors.push('请输入有效的数字')
    } else {
      if (field.min !== undefined && field.min !== '' && num < Number(field.min)) {
        errors.push(`不能小于 ${field.min}`)
      }
      if (field.max !== undefined && field.max !== '' && num > Number(field.max)) {
        errors.push(`不能大于 ${field.max}`)
      }
      if (field.integer && !Number.isInteger(num)) {
        errors.push('必须为整数')
      }
    }
  }

  if (field.type === 'date' && value) {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      errors.push('请选择有效的日期')
    } else {
      if (field.minDate) {
        const minD = new Date(field.minDate)
        if (date < minD) {
          errors.push(`日期不能早于 ${field.minDate}`)
        }
      }
      if (field.maxDate) {
        const maxD = new Date(field.maxDate)
        if (date > maxD) {
          errors.push(`日期不能晚于 ${field.maxDate}`)
        }
      }
    }
  }

  if ((field.type === 'text' || field.type === 'textarea') && value) {
    const str = String(value)
    if (field.minLength !== undefined && field.minLength !== '' && str.length < Number(field.minLength)) {
      errors.push(`最少 ${field.minLength} 个字符`)
    }
    if (field.maxLength !== undefined && field.maxLength !== '' && str.length > Number(field.maxLength)) {
      errors.push(`最多 ${field.maxLength} 个字符`)
    }
    if (field.pattern && value) {
      try {
        const regex = new RegExp(field.pattern)
        if (!regex.test(str)) {
          errors.push(field.patternHint || '格式不符合要求')
        }
      } catch (_) {
        // 正则无效，跳过
      }
    }
    if (field.fieldType === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors.push('请输入有效的邮箱地址')
    }
    if (field.fieldType === 'phone' && value && !/^1[3-9]\d{9}$/.test(str)) {
      errors.push('请输入有效的手机号码')
    }
    if (field.fieldType === 'url' && value) {
      try { new URL(str) } catch (_) { errors.push('请输入有效的URL') }
    }
  }

  return errors
}

export function validateAllFields(fields, formData) {
  const result = {}
  let hasError = false
  fields.forEach(field => {
    const errors = validateField(field, formData[field.id])
    if (errors.length > 0) {
      result[field.id] = errors
      hasError = true
    }
  })
  return { errors: result, valid: !hasError }
}
