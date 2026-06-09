import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ErrorBoundary] 捕获到组件异常:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (typeof this.props.onReset === 'function') {
      this.props.onReset()
    }
    if (typeof window !== 'undefined' && this.props.resetOnReload) {
      try {
        localStorage.clear()
      } catch (_) {}
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleClearStorage = () => {
    try {
      localStorage.clear()
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
      } = this.props

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

            <div className="error-boundary-actions" role="group" aria-label="错误恢复操作">
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
