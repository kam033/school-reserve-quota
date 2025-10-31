import { useState, useEffect } from 'react'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { HomePage } from '@/components/HomePage'
import { XMLUploadPage } from '@/components/XMLUploadPage'
import { TeacherSchedulesPage } from '@/components/TeacherSchedulesPage'
import { AbsencePage } from '@/components/AbsencePage'
import { StatsPage } from '@/components/StatsPage'
import { ScheduleViewPage } from '@/components/ScheduleViewPage'
import { SmartAnalyticsPage } from '@/components/SmartAnalyticsPage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { House } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { ScheduleData } from '@/lib/types'

// 🧭 تعريف الصفحات المتاحة
type Page = 'home' | 'upload' | 'allSchedules' | 'absences' | 'stats' | 'view' | 'analytics'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  // 📦 البيانات الرئيسية لجداول المعلمين
  const [allSchedules, setAllSchedules] = useKV<ScheduleData[]>('allSchedules', [])

  // ⚠️ مفتاح قديم فقط للترحيل (اختياري)
  const [schedules] = useKV<ScheduleData[]>('schedules', [])

  // ✅ تحقق من وجود جدول معتمد أو جداول
  const hasApprovedSchedule = Array.isArray(allSchedules) && allSchedules.some(s => s.approved)
  const hasSchedules = Array.isArray(allSchedules) && allSchedules.length > 0

  // 🧾 تسجيل معلومات للتطوير
  useEffect(() => {
    console.log('🧭 الصفحة الحالية:', currentPage)
    console.log('📄 عدد الجداول:', allSchedules.length)
    console.log('✅ جدول معتمد موجود؟', hasApprovedSchedule)
  }, [currentPage, allSchedules, hasApprovedSchedule])

  // 🔁 ترحيل البيانات من schedules إلى allSchedules لمرة واحدة فقط
  useEffect(() => {
    if (schedules && schedules.length > 0 && (!allSchedules || allSchedules.length === 0)) {
      console.log('🔄 يتم الآن نقل البيانات من schedules إلى allSchedules...')
      setAllSchedules(schedules)
    }
  }, [schedules, allSchedules, setAllSchedules])

  // 🖼️ عرض الصفحة حسب الاختيار
  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage onNavigate={setCurrentPage} />
      case 'upload': return <XMLUploadPage />
      case 'allSchedules': return <TeacherSchedulesPage />
      case 'absences': return <AbsencePage />
      case 'stats': return <StatsPage />
      case 'view': return <ScheduleViewPage />
      case 'analytics': return <SmartAnalyticsPage />
      default: return <HomePage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-emerald-300">
      {/* ✅ الشريط العلوي إذا لم تكن الصفحة الرئيسية */}
      {currentPage !== 'home' && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-2" dir="rtl">
              {/* 🔙 زر الرجوع للصفحة الرئيسية */}
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

              {/* 📌 شارة حالة الجداول */}
              <div className="flex items-center gap-2">
                {hasSchedules ? (
                  <Badge variant={hasApprovedSchedule ? "default" : "outline"} className="text-xs">
                    {hasApprovedSchedule ? '✓ جدول معتمد' : '⚠ جدول غير معتمد'}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    لا يوجد جدول
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖥️ عرض الصفحة المحددة */}
      {renderPage()}

      {/* 🔔 تنبيهات */}
      <Toaster position="top-center" dir="rtl" />
    </div>
  )
}

// 🚀 نقطة البداية للتطبيق
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
