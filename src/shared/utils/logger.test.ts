// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearErrorSink, logger, setErrorSink } from './logger'

describe('Guarded Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    clearErrorSink()
    vi.restoreAllMocks()
    // Restore env stubs. `import.meta.env.PROD` is a read-only data descriptor in
    // this Vitest version, so it must be overridden via `vi.stubEnv` rather than
    // `Object.defineProperty` (which throws on the non-configurable property).
    vi.unstubAllEnvs()
  })

  describe('when in development (PROD is false)', () => {
    beforeEach(() => {
      vi.stubEnv('PROD', false)
    })

    it('should call console.debug when logger.debug is called', () => {
      logger.debug('test debug', { data: 123 })
      expect(consoleDebugSpy).toHaveBeenCalledWith('test debug', { data: 123 })
    })

    it('should call console.info when logger.info is called', () => {
      logger.info('test info', 'extra')
      expect(consoleInfoSpy).toHaveBeenCalledWith('test info', 'extra')
    })

    it('should call console.warn when logger.warn is called', () => {
      logger.warn('test warn')
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warn')
    })

    it('should call console.error when logger.error is called', () => {
      logger.error('test error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error')
    })

    it('should notify the registered sink for warnings with explicit metadata only', () => {
      const sink = vi.fn()
      const metadata = { issueId: 279, component: 'logger' }

      setErrorSink(sink)
      logger.warn('test warn', metadata)

      expect(sink).toHaveBeenCalledTimes(1)
      expect(sink).toHaveBeenCalledWith('warn', 'test warn', [metadata])
    })

    it('should notify the registered sink for errors', () => {
      const sink = vi.fn()
      const metadata = { route: '/dashboard', recoverable: false }

      setErrorSink(sink)
      logger.error('test error', metadata)

      expect(sink).toHaveBeenCalledTimes(1)
      expect(sink).toHaveBeenCalledWith('error', 'test error', [metadata])
    })

    it('should not notify the sink for debug or info logs', () => {
      const sink = vi.fn()

      setErrorSink(sink)
      logger.debug('test debug', { component: 'logger' })
      logger.info('test info', { component: 'logger' })

      expect(sink).not.toHaveBeenCalled()
    })

    it('should not throw when no sink is registered', () => {
      expect(() => logger.warn('test warn without sink')).not.toThrow()
      expect(() => logger.error('test error without sink')).not.toThrow()
    })

    it('should swallow errors thrown by the registered sink', () => {
      const sink = vi.fn(() => {
        throw new Error('remote collector failed')
      })

      setErrorSink(sink)

      expect(() => logger.error('test error', { component: 'logger' })).not.toThrow()
      expect(sink).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error', { component: 'logger' })
    })

    it('should stop notifying the sink after clearErrorSink is called', () => {
      const sink = vi.fn()

      setErrorSink(sink)
      clearErrorSink()
      logger.warn('test warn')

      expect(sink).not.toHaveBeenCalled()
    })
  })

  describe('when in production (PROD is true)', () => {
    beforeEach(() => {
      vi.stubEnv('PROD', true)
    })

    it('should NOT call console.debug when logger.debug is called', () => {
      logger.debug('test debug')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })

    it('should NOT call console.info when logger.info is called', () => {
      logger.info('test info')
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })

    it('should NOT call console.warn when logger.warn is called', () => {
      logger.warn('test warn')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should NOT call console.error when logger.error is called', () => {
      logger.error('test error')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should still notify the registered sink for warnings and errors', () => {
      const sink = vi.fn()

      setErrorSink(sink)
      logger.warn('test warn', { component: 'logger' })
      logger.error('test error', { component: 'logger' })

      expect(sink).toHaveBeenNthCalledWith(1, 'warn', 'test warn', [{ component: 'logger' }])
      expect(sink).toHaveBeenNthCalledWith(2, 'error', 'test error', [{ component: 'logger' }])
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })
})
