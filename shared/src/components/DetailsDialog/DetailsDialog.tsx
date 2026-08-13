import { useMemo } from 'react'
import { toast } from 'react-toastify'
import { useGetEntityQuery } from '@shared/api'
import { Dialog, Icon } from '@ynput/ayon-react-components'
import CodeEditor from '@uiw/react-textarea-code-editor'
import { copyToClipboard } from '@shared/util'

export interface DetailsDialogProps {
  projectName?: string
  entityType: string
  entityIds: string[]
  visible: boolean
  onHide: () => void
}

export const DetailsDialog = ({
  projectName,
  entityType,
  entityIds,
  visible,
  onHide,
}: DetailsDialogProps) => {
  const {
    data = {},
    isLoading,
    isError,
    error,
  } = useGetEntityQuery(
    { projectName, entityType: entityType, entityId: entityIds?.[0] },
    { skip: !visible },
  )

  // Show error toast if the query errored
  if (isError) {
    toast.error(`Unable to load detail. ${error}`)
  }

  // Raw pretty JSON for copying and highlighting
  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }, [data])

  // Keep the early return after hooks to ensure hooks are called on every render in the same order
  if (!visible || (Array.isArray(data) ? data.length < 1 : false)) return null

  return (
    <Dialog
      isOpen={true}
      onClose={onHide}
      size="lg"
      style={{ width: '50vw' }}
      header={`${entityType} detail`}
    >
      <style>{`
        .details-dialog__code { position: relative; }
        .details-dialog__copy { position: absolute; right: 12px; top: 24px; z-index: 10; background: rgba(0,0,0,0.5); border-radius: 4px; padding: 6px; cursor: pointer; display: none; align-items: center; justify-content: center; }
        .details-dialog__code:hover .details-dialog__copy, .details-dialog__code:focus-within .details-dialog__copy { display: flex; }
        .w-tc-editor .token.property { color: var(--color-code-property) !important; }
        .w-tc-editor .token.string { color: var(--color-code-string) !important; }
        .w-tc-editor .token.number { color: var(--color-code-number) !important; }
        .w-tc-editor .token.boolean { color: var(--color-code-number) !important; }
        .w-tc-editor .token.null { color: var(--color-code-null) !important; }
        .w-tc-editor .token.punctuation { color: var(--color-code-punctuation) !important; }
        .w-tc-editor .token.operator { color: var(--color-code-punctuation) !important; }
        .details-dialog__code .w-tc-editor textarea { display: none !important; }
      `}</style>
      <div className="details-dialog__code">
        {isLoading || isError ? (
          <pre>{isLoading ? 'loading...' : 'error...'}</pre>
        ) : (
          <>
            <div
              role="button"
              aria-label="Copy JSON"
              onClick={() => copyToClipboard(rawJson)}
              className="details-dialog__copy"
            >
              <Icon icon={'content_copy'} data-tooltip="Copy to clipboard" />
            </div>
            <CodeEditor
              wrap={'off'}
              value={rawJson}
              language="json"
              placeholder="Please enter JS code."
              readOnly
            />
          </>
        )}
      </div>
    </Dialog>
  )
}