import { useAppStore } from '../stores/appStore'
import { FileText } from 'lucide-react'

export default function NotesPage() {
  const { t } = useAppStore()
  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('note', 'title')}</h1>
      </header>
      <div className="empty-page">
        <FileText size={48} className="empty-icon" />
        <p>{t('common', 'noResults')}</p>
      </div>
    </div>
  )
}
