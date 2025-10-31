import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { ScheduleData, Absence, Teacher } from '@/lib/types'
import { CalendarBlank, UserCircleMinus, Trash, Broom, BookOpen, GraduationCap, Users, Warning, Download, Plus } from '@phosphor-icons/react'

type FilterMode = 'all' | 'subject' | 'grade'

export function AbsencePage() {
  const [schedules] = useKV<ScheduleData[]>('schedules', [])
  const [absences, setAbsences] = useKV<Absence[]>('absences', [])
  const [schoolName, setSchoolName] = useKV<string>('schoolName', '')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [selectedTeacherSubject, setSelectedTeacherSubject] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [selectedDay, setSelectedDay] = useState<string>('الأحد')
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([])
  const [substituteId, setSubstituteId] = useState<string>('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllUnknownDialogOpen, setDeleteAllUnknownDialogOpen] = useState(false)
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null)
  const [substituteWarning, setSubstituteWarning] = useState<string | null>(null)
  const [absentTeachersList, setAbsentTeachersList] = useState<Array<{ id: string; subject: string }>>([])
  const [showAddTeacherDropdown, setShowAddTeacherDropdown] = useState(false)

  const approvedSchedules = useMemo(() => {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return []
    return schedules.filter((s) => s.approved)
  }, [schedules])

  const allTeachers = useMemo(() => {
    if (approvedSchedules.length === 0) return []
    const scheduleTeachers = approvedSchedules.flatMap((schedule) => schedule.teachers || [])
    return scheduleTeachers
  }, [approvedSchedules])

  function getTeacherName(teacherId: string): string {
    return allTeachers.find((t) => t.id === teacherId)?.name || 'غير معروف'
  }

  function getTeacherById(teacherId: string): Teacher | undefined {
    return allTeachers.find((t) => t.id === teacherId)
  }

  function getAbsentTeacherGrade(): string | null {
    if (!selectedTeacherId || approvedSchedules.length === 0 || selectedPeriods.length === 0) return null
    
    for (const schedule of approvedSchedules) {
      if (!schedule.periods || !Array.isArray(schedule.periods)) continue
      
      for (const period of schedule.periods) {
        if (period.teacherId === selectedTeacherId && 
            period.day === selectedDay && 
            selectedPeriods.includes(period.periodNumber)) {
          return period.className || null
        }
      }
    }
    return null
  }

  function checkAdjacentPeriods(teacherId: string): { hasBefore: boolean; hasAfter: boolean; details: string[] } {
    const result = { hasBefore: false, hasAfter: false, details: [] as string[] }
    
    if (!teacherId || approvedSchedules.length === 0 || selectedPeriods.length === 0) {
      return result
    }

    const minPeriod = Math.min(...selectedPeriods)
    const maxPeriod = Math.max(...selectedPeriods)

    approvedSchedules.forEach((schedule) => {
      if (!schedule.periods || !Array.isArray(schedule.periods)) return
      
      schedule.periods.forEach((period) => {
        if (period.teacherId === teacherId && period.day === selectedDay) {
          if (period.periodNumber === minPeriod - 1) {
            result.hasBefore = true
            result.details.push(`الحصة ${period.periodNumber} (قبل)`)
          }
          if (period.periodNumber === maxPeriod + 1) {
            result.hasAfter = true
            result.details.push(`الحصة ${period.periodNumber} (بعد)`)
          }
        }
      })
    })

    return result
  }

  useEffect(() => {
    if (!substituteId) {
      setSubstituteWarning(null)
      return
    }

    const adjacentCheck = checkAdjacentPeriods(substituteId)
    
    if (adjacentCheck.hasBefore || adjacentCheck.hasAfter) {
      const teacher = getTeacherById(substituteId)
      const teacherName = teacher?.name || 'المعلم'
      const periodDetails = adjacentCheck.details.join(' و ')
      setSubstituteWarning(
        `⚠️ تنبيه: المعلم ${teacherName} لديه حصة في ${periodDetails} (قبل أو بعد الحصة المختارة)، يُفضَّل اختيار معلم آخر لضمان راحة المعلم وعدم الإرهاق.`
      )
    } else {
      setSubstituteWarning(null)
    }
  }, [substituteId, selectedPeriods, selectedDay, approvedSchedules])

  const availableSubstitutes = useMemo(() => {
    if (approvedSchedules.length === 0 || !selectedDay || selectedPeriods.length === 0) {
      console.log('Early return: no schedules, day, or periods selected')
      return []
    }
    
    const minPeriod = Math.min(...selectedPeriods)
    const maxPeriod = Math.max(...selectedPeriods)
    
    console.log('Checking availability for:', { 
      selectedDay, 
      selectedPeriods, 
      minPeriod, 
      maxPeriod,
      selectedTeacherId 
    })
    
    const unavailableTeacherIds = new Set<string>()
    
    approvedSchedules.forEach((schedule) => {
      if (schedule.periods && Array.isArray(schedule.periods)) {
        schedule.periods.forEach((period) => {
          if (period.day === selectedDay) {
            if (
              selectedPeriods.includes(period.periodNumber) ||
              period.periodNumber === minPeriod - 1 ||
              period.periodNumber === maxPeriod + 1
            ) {
              unavailableTeacherIds.add(period.teacherId)
              console.log(`Teacher ${period.teacherId} unavailable at period ${period.periodNumber}`)
            }
          }
        })
      }
    })

    console.log('Unavailable teacher IDs:', Array.from(unavailableTeacherIds))
    console.log('Total teachers:', allTeachers.length)

    let filteredTeachers = allTeachers.filter((teacher) => 
      teacher.id !== selectedTeacherId && !unavailableTeacherIds.has(teacher.id)
    )

    console.log('After basic filtering:', filteredTeachers.length)

    const absentTeacher = getTeacherById(selectedTeacherId)
    const absentTeacherGrade = getAbsentTeacherGrade()

    if (filterMode === 'subject' && absentTeacher) {
      filteredTeachers = filteredTeachers.filter(
        (teacher) => teacher.subject === absentTeacher.subject
      )
      console.log('After subject filter:', filteredTeachers.length, 'Subject:', absentTeacher.subject)
    } else if (filterMode === 'grade' && absentTeacherGrade) {
      const teachersWithSameGrade = new Set<string>()
      
      approvedSchedules.forEach((schedule) => {
        if (schedule.periods && Array.isArray(schedule.periods)) {
          schedule.periods.forEach((period) => {
            if (period.className === absentTeacherGrade) {
              teachersWithSameGrade.add(period.teacherId)
            }
          })
        }
      })
      
      console.log('Teachers with same grade:', Array.from(teachersWithSameGrade), 'Grade:', absentTeacherGrade)
      
      filteredTeachers = filteredTeachers.filter((teacher) => 
        teachersWithSameGrade.has(teacher.id)
      )
      
      console.log('After grade filter:', filteredTeachers.length)
    }

    console.log('Final available substitutes:', filteredTeachers.length)
    return filteredTeachers
  }, [approvedSchedules, selectedDay, selectedPeriods, allTeachers, selectedTeacherId, filterMode])

  const handleTogglePeriod = (period: number) => {
    setSelectedPeriods((current) =>
      current.includes(period)
        ? current.filter((p) => p !== period)
        : [...current, period]
    )
  }

  useEffect(() => {
    if (selectedTeacherId) {
      const teacher = getTeacherById(selectedTeacherId)
      if (teacher) {
        setSelectedTeacherSubject(teacher.subject)
      }
    } else {
      setSelectedTeacherSubject('')
      setFilterMode('all')
    }
    setSubstituteId('')
    setSubstituteWarning(null)
  }, [selectedTeacherId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setShowAddTeacherDropdown(false)
      }
    }

    if (showAddTeacherDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddTeacherDropdown])

  const handleAddAbsentTeacher = (teacherId: string) => {
    const teacher = getTeacherById(teacherId)
    if (teacher && !absentTeachersList.some(t => t.id === teacherId)) {
      setAbsentTeachersList((current) => [...current, { id: teacherId, subject: teacher.subject }])
      toast.success(`تمت إضافة ${teacher.name}`)
    }
    setShowAddTeacherDropdown(false)
  }

  const handleRemoveAbsentTeacher = (teacherId: string) => {
    setAbsentTeachersList((current) => current.filter(t => t.id !== teacherId))
    const teacherName = getTeacherName(teacherId)
    toast.success(`تم إزالة ${teacherName}`)
  }

  const handleRecordAbsence = () => {
    if (!selectedTeacherId) {
      toast.error('يرجى اختيار المعلم الغائب')
      return
    }

    if (selectedPeriods.length === 0) {
      toast.error('يرجى اختيار الحصص')
      return
    }

    const newAbsence: Absence = {
      id: `absence-${Date.now()}`,
      teacherId: selectedTeacherId,
      date: selectedDate,
      periods: selectedPeriods,
      substituteTeacherId: substituteId || undefined,
      schoolId: 'school-1',
    }

    setAbsences((current) => [...(current || []), newAbsence])
    
    const teacher = allTeachers.find((t) => t.id === selectedTeacherId)
    toast.success(`تم تسجيل غياب ${teacher?.name} بنجاح`)

    setSelectedTeacherId('')
    setSelectedPeriods([])
    setSubstituteId('')
    setFilterMode('all')
    setSubstituteWarning(null)
  }

  const todayAbsences = useMemo(() => {
    if (!absences || !Array.isArray(absences)) return []
    return absences.filter((a) => a.date === selectedDate)
  }, [absences, selectedDate])

  const unknownAbsencesCount = useMemo(() => {
    if (!absences || !Array.isArray(absences)) return 0
    return absences.filter((absence) => 
      getTeacherName(absence.teacherId) === 'غير معروف' ||
      (absence.substituteTeacherId && getTeacherName(absence.substituteTeacherId) === 'غير معروف')
    ).length
  }, [absences, allTeachers])

  const handleDeleteAbsence = (absenceId: string) => {
    setAbsences((current) => (current || []).filter((a) => a.id !== absenceId))
    toast.success('تم حذف الغياب بنجاح')
    setDeleteDialogOpen(false)
    setAbsenceToDelete(null)
  }

  const handleDeleteClick = (absenceId: string) => {
    setAbsenceToDelete(absenceId)
    setDeleteDialogOpen(true)
  }

  const isAbsenceUnknown = (absenceId: string): boolean => {
    const absence = absences?.find((a) => a.id === absenceId)
    if (!absence) return false
    const teacherUnknown = getTeacherName(absence.teacherId) === 'غير معروف'
    const substituteUnknown = absence.substituteTeacherId ? getTeacherName(absence.substituteTeacherId) === 'غير معروف' : false
    return teacherUnknown || substituteUnknown
  }

  const handleDeleteAllUnknown = () => {
    const count = unknownAbsencesCount
    setAbsences((current) => 
      (current || []).filter((absence) => 
        getTeacherName(absence.teacherId) !== 'غير معروف' &&
        (!absence.substituteTeacherId || getTeacherName(absence.substituteTeacherId) !== 'غير معروف')
      )
    )
    toast.success(`تم حذف ${count} سجل غير معروف بنجاح`)
    setDeleteAllUnknownDialogOpen(false)
  }

  const handleExportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة')
      return
    }

    const todayDate = new Date(selectedDate).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let tableRows = ''
    todayAbsences.forEach((absence, index) => {
      const teacherName = getTeacherName(absence.teacherId)
      const substituteName = absence.substituteTeacherId 
        ? getTeacherName(absence.substituteTeacherId) 
        : 'لا يوجد'
      const periodsText = absence.periods.sort((a, b) => a - b).join('، ')

      tableRows += `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${teacherName}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${periodsText}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${substituteName}</td>
        </tr>
      `
    })

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>جدول الغيابات - ${todayDate}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            padding: 40px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
          }
          
          .school-name {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 10px;
          }
          
          .title {
            font-size: 22px;
            font-weight: 600;
            color: #444;
            margin-bottom: 8px;
          }
          
          .date {
            font-size: 16px;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          thead {
            background: #f5f5f5;
          }
          
          th {
            padding: 14px;
            border: 1px solid #ddd;
            font-weight: 700;
            text-align: center;
            background: #e8e8e8;
            color: #333;
          }
          
          td {
            padding: 12px;
            border: 1px solid #ddd;
          }
          
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
            line-height: 1.8;
          }
          
          .footer-note {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            font-weight: 500;
            color: #856404;
          }
          
          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
            font-size: 18px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">${schoolName || 'مدرسة [اسم المدرسة]'}</div>
          <div class="title">جدول الحصص الاحتياطية</div>
          <div class="date">${todayDate}</div>
        </div>
        
        ${todayAbsences.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">م</th>
                <th style="width: 30%;">المعلم الغائب</th>
                <th style="width: 25%;">الحصص</th>
                <th style="width: 30%;">المعلم البديل</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        ` : `
          <div class="no-data">
            لا توجد غيابات مسجلة في هذا التاريخ
          </div>
        `}
        
        <div class="footer">
          <div class="footer-note">
            ⚠️ الرجاء الالتزام بجدول الحصص وعدم التأخير عن المواعيد المحددة
          </div>
          <div>
            تم الإصدار بتاريخ: ${new Date().toLocaleDateString('ar-SA', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">غياب المعلمين</h1>
          {todayAbsences.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleExportToPDF}
                variant="default"
                size="lg"
                className="gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" weight="bold" />
                تصدير جدول الاحتياطي
              </Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          تسجيل غياب المعلمين وتعيين البدلاء
        </p>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">اسم المدرسة:</Label>
              <Input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="أدخل اسم المدرسة (سيظهر في تصدير PDF)"
                className="flex-1 bg-background"
              />
            </div>
          </CardContent>
        </Card>

        {approvedSchedules.length === 0 ? (
          <Card className="border-amber-500/50 bg-amber-50/50">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-foreground">
                  ⚠️ لا يوجد جدول معتمد
                </p>
                <p className="text-muted-foreground">
                  يرجى رفع ملف XML واعتماده أولاً من صفحة "تحميل الجدول"
                </p>
                <div className="pt-4">
                  <Button onClick={() => window.history.back()} variant="outline">
                    العودة للصفحة الرئيسية
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>تسجيل غياب جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md"
                />
              </div>

              <div className="space-y-2">
                <Label>اليوم</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المعلم الغائب</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر المعلم الغائب من القائمة" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allTeachers.length === 0 ? (
                      <SelectItem value="no-teachers" disabled>
                        لا يوجد معلمين في النظام
                      </SelectItem>
                    ) : (
                      allTeachers
                        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
                        .map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            <div className="flex items-center justify-between w-full gap-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{teacher.name}</span>
                                <span className="text-muted-foreground text-sm">({teacher.subject})</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                {!selectedTeacherId && (
                  <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 px-3 py-2 rounded-md flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>اختر المعلم الغائب من القائمة المنسدلة، ستظهر المادة تلقائياً</span>
                  </div>
                )}
                {selectedTeacherSubject && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">المادة: </span>
                      <span className="font-medium text-foreground">{selectedTeacherSubject}</span>
                    </span>
                  </div>
                )}

                {absentTeachersList.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">المعلمين الغائبين المضافين:</Label>
                    <div className="space-y-2">
                      {absentTeachersList.map((absentTeacher) => (
                        <div
                          key={absentTeacher.id}
                          className="flex items-center justify-between gap-2 p-3 bg-card border border-border rounded-md"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{getTeacherName(absentTeacher.id)}</span>
                              <span className="text-xs text-muted-foreground">{absentTeacher.subject}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAbsentTeacher(absentTeacher.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative dropdown-container">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddTeacherDropdown(!showAddTeacherDropdown)}
                    className="w-full gap-2"
                    disabled={allTeachers.length === 0}
                  >
                    <Plus className="w-4 h-4" />
                    إضافة معلم غائب
                  </Button>
                  
                  {showAddTeacherDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                      {allTeachers
                        .filter(t => 
                          t.id !== selectedTeacherId && 
                          !absentTeachersList.some(at => at.id === t.id)
                        )
                        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
                        .map((teacher) => (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => handleAddAbsentTeacher(teacher.id)}
                            className="w-full px-3 py-3 text-right hover:bg-accent transition-colors flex items-center justify-between gap-2 border-b border-border last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{teacher.name}</span>
                              <span className="text-muted-foreground text-sm">({teacher.subject})</span>
                            </div>
                          </button>
                        ))}
                      {allTeachers.filter(t => 
                        t.id !== selectedTeacherId && 
                        !absentTeachersList.some(at => at.id === t.id)
                      ).length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          لا يوجد معلمين إضافيين متاحين
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>الحصص</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((period) => (
                    <Button
                      key={period}
                      variant={selectedPeriods.includes(period) ? 'default' : 'outline'}
                      onClick={() => handleTogglePeriod(period)}
                      className="w-full"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>المعلم البديل (اختياري)</Label>
                  {selectedPeriods.length > 0 && availableSubstitutes.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                      ✓ متفرغون تماماً
                    </Badge>
                  )}
                </div>
                
                {!selectedTeacherId && (
                  <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 px-3 py-2 rounded-md flex items-center gap-2">
                    <Warning className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>يُرجى اختيار المعلم الغائب أولاً لتفعيل خيارات المعلم البديل</span>
                  </div>
                )}
                
                {selectedTeacherId && selectedPeriods.length === 0 && (
                  <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 px-3 py-2 rounded-md flex items-center gap-2">
                    <Warning className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>يُرجى اختيار الحصص أولاً لعرض المعلمين المتفرغين</span>
                  </div>
                )}
                
                {selectedTeacherId && selectedPeriods.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs text-muted-foreground">📋 اختر طريقة التصفية لاختيار المعلم البديل:</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={filterMode === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterMode('all')}
                        className="flex-1 gap-2"
                      >
                        <Users className="w-4 h-4" />
                        الجدول العام
                      </Button>
                      <Button
                        type="button"
                        variant={filterMode === 'subject' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterMode('subject')}
                        className="flex-1 gap-2"
                        disabled={!getTeacherById(selectedTeacherId)?.subject}
                      >
                        <BookOpen className="w-4 h-4" />
                        نفس المادة
                      </Button>
                      <Button
                        type="button"
                        variant={filterMode === 'grade' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterMode('grade')}
                        className="flex-1 gap-2"
                        disabled={!getAbsentTeacherGrade()}
                      >
                        <GraduationCap className="w-4 h-4" />
                        نفس الصف
                      </Button>
                    </div>
                    {filterMode === 'all' && (
                      <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 px-3 py-2 rounded-md">
                        📋 عرض جميع المعلمين المتاحين (المتفرغين) في الجدول العام
                      </div>
                    )}
                    {filterMode === 'subject' && getTeacherById(selectedTeacherId) && (
                      <div className="text-xs text-muted-foreground bg-green-50 border border-green-200 px-3 py-2 rounded-md">
                        📘 عرض المعلمين المتفرغين في نفس المادة: <span className="font-medium text-foreground">{getTeacherById(selectedTeacherId)?.subject}</span>
                      </div>
                    )}
                    {filterMode === 'grade' && getAbsentTeacherGrade() && (
                      <div className="text-xs text-muted-foreground bg-purple-50 border border-purple-200 px-3 py-2 rounded-md">
                        🏫 عرض المعلمين المتفرغين في نفس الصف: <span className="font-medium text-foreground">{getAbsentTeacherGrade()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-muted-foreground">
                        {availableSubstitutes.length > 0 ? (
                          <>
                            <span className="font-medium text-primary">{availableSubstitutes.length}</span> معلم متفرغ
                          </>
                        ) : (
                          <span className="text-destructive">لا يوجد معلمين متفرغين</span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        ✓ متفرغون قبل وأثناء وبعد الحصة
                      </span>
                    </div>
                  </div>
                )}

                <Select value={substituteId} onValueChange={setSubstituteId} disabled={!selectedTeacherId || selectedPeriods.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedTeacherId ? "اختر المعلم الغائب أولاً" : selectedPeriods.length === 0 ? "اختر الحصص أولاً" : "اختر المعلم البديل"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubstitutes.length > 0 ? (
                      availableSubstitutes.map((teacher) => {
                        const adjacentCheck = checkAdjacentPeriods(teacher.id)
                        const hasAdjacent = adjacentCheck.hasBefore || adjacentCheck.hasAfter
                        
                        return (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{teacher.name} - {teacher.subject}</span>
                              {hasAdjacent && (
                                <span className="text-amber-600 text-xs">⚠️</span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })
                    ) : (
                      <SelectItem value="none" disabled>
                        لا يوجد معلمين متاحين
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {substituteWarning && (
                  <Alert className="border-amber-500 bg-amber-50/80 shadow-sm">
                    <Warning className="h-5 w-5 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-900 font-medium leading-relaxed">
                      {substituteWarning}
                      <div className="mt-2 text-xs text-amber-700 font-normal">
                        💡 يمكنك المتابعة بالاختيار أو تغيير المعلم البديل لضمان الراحة المناسبة.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedPeriods.length > 0 && availableSubstitutes.length === 0 && selectedTeacherId && (
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertDescription className="text-sm text-destructive">
                      ⚠️ جميع المعلمين مشغولون (لا يوجد معلمين متفرغين قبل أو أثناء أو بعد الحصص المختارة)
                      {filterMode !== 'all' && (
                        <div className="mt-1 text-xs">
                          💡 جرب استخدام "الجدول العام" لعرض جميع المعلمين المتفرغين
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button onClick={handleRecordAbsence} className="w-full">
                <UserCircleMinus className="ml-2" />
                تسجيل الغياب
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarBlank className="w-5 h-5" />
                    الغيابات اليوم
                  </CardTitle>
                  {unknownAbsencesCount > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteAllUnknownDialogOpen(true)}
                      className="gap-2"
                    >
                      <Broom className="w-4 h-4" />
                      حذف جميع السجلات "غير معروف" ({unknownAbsencesCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {todayAbsences.length > 0 ? (
                  <div className="space-y-3">
                    {todayAbsences.map((absence) => {
                      const teacherName = getTeacherName(absence.teacherId)
                      const isUnknown = teacherName === 'غير معروف' || 
                        (absence.substituteTeacherId && getTeacherName(absence.substituteTeacherId) === 'غير معروف')
                      
                      return (
                        <div
                          key={absence.id}
                          className={`p-4 border rounded-lg space-y-2 ${isUnknown ? 'bg-destructive/5 border-destructive/30' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium flex items-center gap-2">
                              {teacherName}
                              {teacherName === 'غير معروف' && (
                                <Badge variant="destructive" className="text-xs">
                                  غير معروف
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">غائب</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(absence.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">الحصص:</span>
                            <div className="flex gap-1">
                              {absence.periods.map((p) => (
                                <Badge key={p} variant="outline">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {absence.substituteTeacherId && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">البديل: </span>
                              <span className={`font-medium ${getTeacherName(absence.substituteTeacherId) === 'غير معروف' ? 'text-destructive' : 'text-accent'}`}>
                                {getTeacherName(absence.substituteTeacherId)}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا يوجد غيابات مسجلة لهذا اليوم
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {absenceToDelete && isAbsenceUnknown(absenceToDelete) ? '⚠️ حذف سجل غير معروف' : 'تأكيد الحذف'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {absenceToDelete && isAbsenceUnknown(absenceToDelete) 
                ? 'سيتم حذف هذا السجل غير المعروف نهائيًا من النظام.'
                : 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => absenceToDelete && handleDeleteAbsence(absenceToDelete)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllUnknownDialogOpen} onOpenChange={setDeleteAllUnknownDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>🧹 حذف جميع السجلات "غير معروف"</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              سيتم حذف <span className="font-bold text-destructive">{unknownAbsencesCount}</span> سجل غير معروف نهائيًا من النظام.
              <br />
              <br />
              هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllUnknown}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              حذف الكل ({unknownAbsencesCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
