import { useState } from 'react'
import { logger } from '../../../../shared/utils/logger'
import { Download, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useTheme } from '../../../../shared/contexts/ThemeContext'
import { Invoice, InvoiceStatus } from '../../types'
import { downloadInvoice } from '../../../../shared/api/client'

interface InvoicesTabProps {
  invoices: Invoice[]
}

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\-_]/g, '-')
}

export function InvoicesTab({ invoices }: InvoicesTabProps) {
  const { theme } = useTheme()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({})

  /**
   * Maps invoice statuses to semantic status tokens.
   *
   * Tokens are defined in `src/styles/theme.css` and intentionally keep
   * `pending` distinct from `warning` for semantic clarity across the app.
   */
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-[var(--status-success-bg)]',
          text: 'text-[var(--status-success-foreground)]',
          border: 'border-[var(--status-success-border)]',
          icon: CheckCircle2,
        }
      case 'pending':
        return {
          bg: 'bg-[var(--status-pending-bg)]',
          text: 'text-[var(--status-pending-foreground)]',
          border: 'border-[var(--status-pending-border)]',
          icon: Clock,
        }
      case 'overdue':
        return {
          bg: 'bg-[var(--status-error-bg)]',
          text: 'text-[var(--status-error-foreground)]',
          border: 'border-[var(--status-error-border)]',
          icon: AlertCircle,
        }
    }
  }

  /**
   * Fetches the PDF for `invoice` from the API and triggers a browser download.
   *
   * Creates a temporary object URL from the response Blob, clicks a transient
   * `<a>` element to start the download, then immediately revokes the URL to
   * release the Blob from memory. The filename is derived from
   * `invoice.invoiceNumber` with non-safe characters stripped so it is never
   * influenced by unsanitized server-provided values.
   *
   * Shows a per-row spinner while the fetch is in flight and writes a per-row
   * error message on failure, leaving other rows fully interactive.
   *
   * @param invoice - The invoice row whose PDF should be downloaded.
   */
  const handleDownloadInvoice = async (invoice: Invoice): Promise<void> => {
    setDownloadingId(invoice.id)
    setDownloadErrors((prev) => {
      const next = { ...prev }
      delete next[invoice.id]
      return next
    })

    try {
      logger.debug('Downloading invoice:', invoice.invoiceNumber)
      const blob = await downloadInvoice(invoice.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `invoice-${sanitizeFilename(invoice.invoiceNumber)}.pdf`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed. Please try again.'
      setDownloadErrors((prev) => ({ ...prev, [invoice.id]: message }))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className={`text-[20px] font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          Invoices
        </h3>
        <p
          className={`text-[14px] transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}
        >
          View and download your billing invoices.
        </p>
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-3">
          {/* overflow-x-auto + min-w prevents the grid from collapsing on narrow screens */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Table Header */}
              <div
                className={`grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.6fr] gap-4 px-6 py-3 border-b-2 transition-colors ${
                  theme === 'dark' ? 'border-white/20' : 'border-white/20'
                }`}
              >
                {['Invoice', 'Date', 'Amount', 'Period', 'Status', 'Action'].map((col) => (
                  <div
                    key={col}
                    className={`text-[12px] font-bold uppercase tracking-wide transition-colors ${
                      theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
                    }`}
                  >
                    {col}
                  </div>
                ))}
              </div>

              {/* Invoice Rows */}
              {invoices.map((invoice) => {
                const statusConfig = getStatusColor(invoice.status)
                const StatusIcon = statusConfig.icon
                const isDownloading = downloadingId === invoice.id
                const rowError = downloadErrors[invoice.id]

                return (
                  <div key={invoice.id} className="mt-3">
                    <div
                      className={`grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.6fr] gap-4 px-6 py-5 rounded-[16px] backdrop-blur-[25px] border transition-all ${
                        theme === 'dark'
                          ? 'bg-white/[0.08] border-white/15 hover:bg-white/[0.12] hover:border-[#c9983a]/20'
                          : 'bg-white/[0.08] border-white/15 hover:bg-white/[0.15] hover:border-[#c9983a]/20'
                      }`}
                    >
                      {/* Invoice Number & Description */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
                              theme === 'dark' ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/15'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-[#c9983a]" />
                          </div>
                          <h4
                            className={`text-[14px] font-bold transition-colors ${
                              theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                            }`}
                          >
                            {invoice.invoiceNumber}
                          </h4>
                        </div>
                        <p
                          className={`text-[12px] ml-10 transition-colors ${
                            theme === 'dark' ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'
                          }`}
                        >
                          {invoice.description}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="flex items-center">
                        <span
                          className={`text-[13px] transition-colors ${
                            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                          }`}
                        >
                          {new Date(invoice.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center">
                        <span
                          className={`text-[15px] font-bold transition-colors ${
                            theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                          }`}
                        >
                          {invoice.amount.toLocaleString('en-US', {
                            style: 'currency',
                            currency: invoice.currency,
                          })}
                        </span>
                      </div>

                      {/* Billing Period */}
                      <div className="flex items-center">
                        <span
                          className={`text-[13px] transition-colors ${
                            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                          }`}
                        >
                          {invoice.billingPeriod}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border ${statusConfig.bg} ${statusConfig.border}`}
                        >
                          <StatusIcon className={`w-3 h-3 ${statusConfig.text}`} />
                          <span
                            className={`text-[11px] font-semibold capitalize ${statusConfig.text}`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                      </div>

                      {/* Download Action */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={isDownloading}
                          aria-label={isDownloading ? 'Downloading…' : 'Download Invoice'}
                          className={`p-2.5 rounded-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            theme === 'dark'
                              ? 'hover:bg-white/[0.15] text-[#c9983a]'
                              : 'hover:bg-white/[0.2] text-[#c9983a]'
                          }`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {rowError && (
                      <p
                        role="alert"
                        className={`text-[12px] mt-1.5 px-6 transition-colors ${
                          theme === 'dark' ? 'text-[#ef4444]' : 'text-[#dc2626]'
                        }`}
                      >
                        {rowError}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              theme === 'dark' ? 'bg-white/[0.08]' : 'bg-white/[0.15]'
            }`}
          >
            <FileText
              className={`w-8 h-8 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}
            />
          </div>
          <p
            className={`text-[14px] mb-2 transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}
          >
            No invoices yet
          </p>
          <p
            className={`text-[13px] transition-colors ${
              theme === 'dark' ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'
            }`}
          >
            Your billing invoices will appear here
          </p>
        </div>
      )}
    </div>
  )
}
