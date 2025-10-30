import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { ScheduleData, Absence, Teacher } from '@/lib/types'
import { CalendarBlank, UserCircleMinus, Trash } from '@phosphor-icons/react'

export function AbsencePage() {
  const [schedules] = useKV<ScheduleData[]>('schedules', [])
  const [absences, setAbsences] = useKV<Absence[]>('absences', [])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [selectedDay, setSelectedDay] = useState<string>('الأحد')
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([])
  const [substituteId, setSubstituteId] = useState<string>('')

  const approvedSchedules = useMemo(() => {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return []
    return schedules.filter((s) => s.approved)
  }, [schedules])

  const allTeachers = useMemo(() => {
    if (approvedSchedules.length === 0) return []
    return approvedSchedules.flatMap((schedule) => schedule.teachers || [])
  }, [approvedSchedules])

  const availableSubstitutes = useMemo(() => {
    if (approvedSchedules.length === 0 || !selectedDay || selectedPeriods.length === 0) return []
    
    const busyTeacherIds = new Set<string>()
    
    approvedSchedules.forEach((schedule) => {
      if (schedule.periods && Array.isArray(schedule.periods)) {
        schedule.periods.forEach((period) => {
          if (period.day === selectedDay && selectedPeriods.includes(period.periodNumber)) {
            busyTeacherIds.add(period.teacherId)
          }
        })
      }
    })

    return allTeachers.filter((teacher) => 
      teacher.id !== selectedTeacherId && !busyTeacherIds.has(teacher.id)
    )
  }, [approvedSchedules, selectedDay, selectedPeriods, allTeachers, selectedTeacherId])

  const handleTogglePeriod = (period: number) => {
    setSelectedPeriods((current) =>
      current.includes(period)
        ? current.filter((p) => p !== period)
        : [...current, period]
    )
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
  }

  const todayAbsences = useMemo(() => {
    if (!absences || !Array.isArray(absences)) return []
    return absences.filter((a) => a.date === selectedDate)
  }, [absences, selectedDate])

  const getTeacherName = (teacherId: string): string => {
    return allTeachers.find((t) => t.id === teacherId)?.name || 'غير معروف'
  }

  const handleDeleteAbsence = (absenceId: string) => {
    setAbsences((current) => (current || []).filter((a) => a.id !== absenceId))
    toast.success('تم حذف الغياب بنجاح')
  }

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">غياب المعلمين</h1>
        <p className="text-muted-foreground mb-8">
          تسجيل غياب المعلمين وتعيين البدلاء
        </p>

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
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعلم" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>المعلم البديل (اختياري)</Label>
                <Select value={substituteId} onValueChange={setSubstituteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعلم البديل" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubstitutes.length > 0 ? (
                      availableSubstitutes.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} - {teacher.subject}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        لا يوجد معلمين متاحين
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedPeriods.length > 0 && availableSubstitutes.length === 0 && (
                  <p className="text-sm text-destructive">
                    جميع المعلمين مشغولون في هذه الحصص
                  </p>
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
                <CardTitle className="flex items-center gap-2">
                  <CalendarBlank className="w-5 h-5" />
                  الغيابات اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayAbsences.length > 0 ? (
                  <div className="space-y-3">
                    {todayAbsences.map((absence) => (
                      <div
                        key={absence.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{getTeacherName(absence.teacherId)}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">غائب</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAbsence(absence.id)}
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
                            <span className="font-medium text-accent">
                              {getTeacherName(absence.substituteTeacherId)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
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
    </div>
  )
}
