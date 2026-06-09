import { useState, useEffect } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item === null || item === undefined) {
        return typeof initialValue === 'function' ? initialValue() : initialValue
      }
      return JSON.parse(item)
    } catch (error) {
      console.warn(`localStorage 读取失败 (${key}):`, error)
      return typeof initialValue === 'function' ? initialValue() : initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`localStorage 保存失败 (${key}):`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

export const STORAGE_KEYS = {
  FORM_FIELDS: 'form-workflow-builder:formFields',
  WORKFLOW_NODES: 'form-workflow-builder:workflowNodes',
}

export const clearAllStorage = () => {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
}
