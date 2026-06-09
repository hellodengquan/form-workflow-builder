import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoverySnapshot: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })

    const { recoveryStorageKey, onCapture } = this.props

    try {
      if (typeof onCapture === 'function') {
        onCapture({
          error,
          errorInfo,
          capturedAt: Date.now(),
        })
      }
    } catch (_e) {
      /* ignore */
    }

    try {
      if (typeof recoveryStorageKey === 'string' && recoveryStorageKey.length > 0) {
        const raw = localStorage.getItem(recoveryStorageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          const age = Date.now() - (parsed?.capturedAt || 0)
          if (age < 1000 * 60 * 60 * 24) {
            this.setState({ recoverySnapshot: parsed })
          } else {
            try {
              localStorage.removeItem(recoveryStorageKey)
            } catch (_) {}
          }
        }
      }
    } catch (_e) {
      /* ignore */
    }

    if (typeof console !== 'undefined' && console.error) {
      console.error('[ErrorBoundary] 捕获到组件异常:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, recoverySnapshot: null })
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset()
      } catch (_e) {
        /* 避免重置回调再次抛错卡死 */
      }
    }
    if (typeof window !== 'undefined' && this.props.resetOnReload) {
      try {
        localStorage.clear()
      } catch (_) {}
    }
  }

  handleRestoreFromSnapshot = () => {
    const { recoveryStorageKey, onRestore } = this.props
    let snapshot = this.state.recoverySnapshot
    try {
      if (!snapshot && recoveryStorageKey) {
        const raw = localStorage.getItem(recoveryStorageKey)
        snapshot = raw ? JSON.parse(raw) : null
      }
    } catch (_e) {
      snapshot = null
    }

    if (typeof onRestore === 'function' && snapshot) {
      try {
        const restored = onRestore(snapshot)
        if (restored !== false) {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            recoverySnapshot: null,
          })
          try {
            if (recoveryStorageKey) {
              localStorage.removeItem(recoveryStorageKey)
            }
          } catch (_) {}
          return
        }
      } catch (_e) {
        /* onRestore 出错时降级到普通重置 */
      }
    }
    // 如果没有 snapshot 或 onRestore 未处理，走重置
    this.handleReset()
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleClearStorage = () => {
    try {
      const { recoveryStorageKey } = this.props
      localStorage.clear()
      // 清理可能被浏览器自动恢复的缓存键
      if (recoveryStorageKey) {
        try {
          sessionStorage.removeItem(recoveryStorageKey)
        } catch (_) {}
      }
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const {
        title = '页面遇到了意外错误',
        subtitle = '应用已自动保护，您可以尝试以下操作恢复：',
        showReset = true,
        showReload = true,
        showClearStorage = true,
        recoveryStorageKey,
      } = this.props

      const hasSnapshot = Boolean(
        this.state.recoverySnapshot ||
          (recoveryStorageKey && (() => {
            try {
              return localStorage.getItem(recoveryStorageKey)
            } catch (_) {
              return null
            }
          })())
      )

      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-label="错误边界提示"
          className="error-boundary"
        >
          <div className="error-boundary-card" role="document">
            <div className="error-boundary-icon" aria-hidden="true">
              <span>⚠️</span>
            </div>
            <h2 className="error-boundary-title" tabIndex={-1}>{title}</h2>
            <p className="error-boundary-subtitle">{subtitle}</p>

            {hasSnapshot && (
              <div
                role="status"
                aria-live="polite"
                className="eb-recovery-hint"
              >
                💾 检测到崩溃前的编辑数据快照（
                {this.state.recoverySnapshot?.capturedAt
                  ? new Date(this.state.recoverySnapshot.capturedAt).toLocaleString()
                  : '最近一次崩溃前保存'}
                ），可优先尝试还原。
              </div>
            )}

            {this.state.error && (
              <details className="error-boundary-details">
                <summary tabIndex={0}>查看技术信息（便于报告问题）</summary>
                <div className="error-tech-info">
                  <div>
                    <strong>错误消息：</strong>
                    <pre>{String(this.state.error?.message || this.state.error)}</pre>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div style={{ marginTop: 12 }}>
                      <strong>组件栈：</strong>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div
              className="error-boundary-actions"
              role="group"
              aria-label="错误恢复操作"
            >
              {hasSnapshot && (
                <button
                  type="button"
                  key="restore"
                  className="eb-btn eb-btn-success"
                  onClick={this.handleRestoreFromSnapshot}
                  aria-label="从崩溃前的编辑数据快照还原表单与工作流，而非重置或重载"
                >
                  💾 恢复编辑数据
                </button>
              )}
              {showReset && (
                <button
                  type="button"
                  className="eb-btn eb-btn-primary"
                  onClick={this.handleReset}
                  aria-label="尝试重置组件状态并继续使用"
                >
                  🔄 重置状态
                </button>
              )}
              {showReload && (
                <button
                  type="button"
                  className="eb-btn eb-btn-outline"
                  onClick={this.handleReload}
                  aria-label="重新加载整个页面"
                >
                  🔃 刷新页面
                </button>
              )}
              {showClearStorage && (
                <button
                  type="button"
                  className="eb-btn eb-btn-danger"
                  onClick={this.handleClearStorage}
                  aria-label="清除本地存储的数据并刷新页面"
                >
                  🧹 清除数据并重试
                </button>
              )}
            </div>

            <p className="error-boundary-tip">
              💡 如问题持续出现，可将上方「技术信息」复制后联系技术支持。
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
