import { Trash2, Tag, X, CheckSquare, Square } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

interface Props {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onAddTag?: (tag: string) => void
  onCancel: () => void
  allTags?: string[]
}

export default function BulkActionBar({
  selectedCount, totalCount, onSelectAll, onDeselectAll,
  onDelete, onAddTag, onCancel, allTags = [],
}: Props) {
  const { t } = useAppStore()
  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="bulk-bar">
      <div className="bulk-bar-left">
        <button className="icon-btn" onClick={allSelected ? onDeselectAll : onSelectAll}>
          {allSelected
            ? <CheckSquare size={20} style={{ color: 'var(--color-primary)' }} />
            : <Square size={20} />}
        </button>
        <span className="bulk-count">
          {selectedCount} / {totalCount} {t('bulk', 'items')}
        </span>
      </div>

      <div className="bulk-bar-right">
        {onAddTag && allTags.length > 0 && selectedCount > 0 && (
          <div className="bulk-tag-dropdown">
            <button className="bulk-action-btn">
              <Tag size={15} />
            </button>
            <div className="bulk-tag-menu">
              {allTags.map((tag) => (
                <button key={tag} className="bulk-tag-item" onMouseDown={(e) => { e.preventDefault(); onAddTag(tag) }}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCount > 0 && (
          <button
            className="bulk-action-btn danger"
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        )}

        <button className="bulk-action-btn" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
