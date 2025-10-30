import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { ScheduleData, Period } from '@/lib/types'

export function TeacherSchedulesPage() {
  const [schedules] = useKV<ScheduleData[]>('schedules', [])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  const allTeachers = useMemo(() => {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return []
    return schedules.flatMap((schedule) => schedule.teachers || [])
  }, [schedules])

  const selectedTeacher = useMemo(() => {
    return allTeachers.find((t) => t.id === selectedTeacherId)
  }, [allTeachers, selectedTeacherId])

  const teacherPeriods = useMemo(() => {
    if (!schedules || !Array.isArray(schedules) || !selectedTeacherId || schedules.length === 0) return []
    return schedules
      .flatMap((schedule) => schedule.periods || [])
      .filter((period) => period.teacherId === selectedTeacherId)
  }, [schedules, selectedTeacherId])

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  const periodNumbers = [1, 2, 3, 4, 5, 6, 7, 8]

  const getPeriodForCell = (day: string, periodNum: number): Period | undefined => {
    return teacherPeriods.find(
      (p) => p.day === day && p.periodNumber === periodNum
    )
  }

  const totalWeeklyPeriods = teacherPeriods.length

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">جداول المعلمين</h1>
        <p className="text-muted-foreground mb-8">
          عرض الجدول الأسبوعي لكل معلم
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>اختر المعلم</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر معلم لعرض جدوله" />
              </SelectTrigger>
              <SelectContent>
                {allTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTeacher && (
          <>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedTeacher.name}</h2>
                    <p className="text-muted-foreground">{selectedTeacher.subject}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">عدد الحصص الأسبوعية</p>
                    <p className="text-3xl font-bold text-primary">{totalWeeklyPeriods}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الجدول الأسبوعي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-border p-3 bg-muted text-right font-medium">
                          الحصة
                        </th>
                        {days.map((day) => (
                          <th
                            key={day}
                            className="border border-border p-3 bg-muted text-center font-medium"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodNumbers.map((periodNum) => (
                        <tr key={periodNum}>
                          <td className="border border-border p-3 bg-muted text-center font-medium">
                            {periodNum}
                          </td>
                          {days.map((day) => {
                            const period = getPeriodForCell(day, periodNum)
                            return (
                              <td
                                key={`${day}-${periodNum}`}
                                className="border border-border p-3 text-center"
                              >
                                {period ? (
                                  <div className="space-y-1">
                                    <Badge variant="default" className="w-full">
                                      {period.subject}
                                    </Badge>
                                    {period.className && (
                                      <p className="text-xs text-muted-foreground">
                                        {period.className}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!selectedTeacher && allTeachers.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                لم يتم رفع أي جداول بعد. يرجى رفع ملف XML أولاً.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
