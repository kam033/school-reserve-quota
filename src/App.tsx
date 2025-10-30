import { useState } from 'react'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { HomePage } from '@/components/HomePage'
import { XMLUploadPage } from '@/components/XMLUploadPage'
import { TeacherSchedulesPage } from '@/components/TeacherSchedulesPage'
import { AbsencePage } from '@/components/AbsencePage'
import { StatsPage } from '@/components/StatsPage'
import { Button } from '@/components/ui/button'
import { House, ArrowRight } from '@phosphor-icons/react'

type Page = 'home' | 'upload' | 'schedules' | 'absences' | 'stats'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />
      case 'upload':
        return <XMLUploadPage />
      case 'schedules':
        return <TeacherSchedulesPage />
      case 'absences':
        return <AbsencePage />
      case 'stats':
        return <StatsPage />
      default:
        return <HomePage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {currentPage !== 'home' && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2" dir="rtl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('home')}
                className="gap-2"
              >
                <House className="w-4 h-4" />
                الرئيسية
              </Button>
            </div>
          </div>
        </div>
      )}
      {renderPage()}
      <Toaster position="top-center" dir="rtl" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
