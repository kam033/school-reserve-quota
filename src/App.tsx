import { useState, useEffect } from 'react'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { HomePage } from '@/components/HomePage'
import { XMLUploadPage } from '@/components/XMLUploadPage'
import { TeacherSchedulesPage } from '@/components/TeacherSchedulesPage'
import { AbsencePage } from '@/components/AbsencePage'
import { StatsPage } from '@/components/StatsPage'
import { ScheduleViewPage } from '@/components/ScheduleViewPage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { House } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { ScheduleData } from '@/lib/types'

type Page = 'home' | 'upload' | 'schedules' | 'absences' | 'stats' | 'view'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [schedules] = useKV<ScheduleData[]>('schedules', [])

  const hasApprovedSchedule = schedules && Array.isArray(schedules) && schedules.some(s => s.approved)
  const hasSchedules = schedules && Array.isArray(schedules) && schedules.length > 0

  useEffect(() => {
    console.log('Current page:', currentPage)
    console.log('Has schedules:', hasSchedules)
    console.log('Has approved schedule:', hasApprovedSchedule)
    console.log('Schedules data:', schedules)
  }, [currentPage, hasSchedules, hasApprovedSchedule, schedules])

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
      case 'view':
        return <ScheduleViewPage />
      default:
        return <HomePage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {currentPage !== 'home' && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-2" dir="rtl">
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                {hasSchedules && (
                  <Badge variant={hasApprovedSchedule ? "default" : "outline"} className="text-xs">
                    {hasApprovedSchedule ? '✓ جدول معتمد' : '⚠ جدول غير معتمد'}
                  </Badge>
                )}
                {!hasSchedules && (
                  <Badge variant="destructive" className="text-xs">
                    لا يوجد جدول
                  </Badge>
                )}
              </div>
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
