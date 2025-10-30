import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { ScheduleData, Absence } from '@/lib/types'
import { Users, BookOpen, Clock, CalendarX, CheckCircle, WarningCircle } from '@phosphor-icons/react'

export function StatsPage() {
  const [schedules] = useKV<ScheduleData[]>('schedules', [])
  const [absences] = useKV<Absence[]>('absences', [])

  const stats = useMemo(() => {
    if (!schedules) {
      return {
        totalTeachers: 0,
        totalSubjects: 0,
        totalPeriods: 0,
        absencesTotal: 0,
        absencesToday: 0,
        coverageRate: 0,
        warnings: [],
      }
    }

    const allTeachers = schedules.flatMap((s) => s.teachers)
    const allPeriods = schedules.flatMap((s) => s.periods)
    const uniqueSubjects = new Set(allTeachers.map((t) => t.subject))
    
    const today = new Date().toISOString().split('T')[0]
    const todayAbsences = (absences || []).filter((a) => a.date === today)
    const coveredAbsences = todayAbsences.filter((a) => a.substituteTeacherId)
    
    const coverageRate = todayAbsences.length > 0
      ? Math.round((coveredAbsences.length / todayAbsences.length) * 100)
      : 100

    const warnings: string[] = []
    
    const teacherNames = new Set<string>()
    const duplicateNames = new Set<string>()
    allTeachers.forEach((t) => {
      if (teacherNames.has(t.name)) {
        duplicateNames.add(t.name)
      }
      teacherNames.add(t.name)
    })
    
    if (duplicateNames.size > 0) {
      warnings.push(`تكرار في أسماء المعلمين (${duplicateNames.size} اسم مكرر)`)
    }

    const teachersWithEncodingIssues = allTeachers.filter(
      (t) => t.name.includes('�') || t.name.includes('?')
    )
    if (teachersWithEncodingIssues.length > 0) {
      warnings.push(`مشاكل ترميز في ${teachersWithEncodingIssues.length} معلم`)
    }

    if (coverageRate < 50) {
      warnings.push('نسبة التغطية منخفضة - أقل من 50%')
    }

    return {
      totalTeachers: allTeachers.length,
      totalSubjects: uniqueSubjects.size,
      totalPeriods: allPeriods.length,
      absencesTotal: (absences || []).length,
      absencesToday: todayAbsences.length,
      coverageRate,
      warnings,
    }
  }, [schedules, absences])

  const statCards = [
    {
      title: 'إجمالي المعلمين',
      value: stats.totalTeachers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'المواد الدراسية',
      value: stats.totalSubjects,
      icon: BookOpen,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'إجمالي الحصص',
      value: stats.totalPeriods,
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'الغيابات اليوم',
      value: stats.absencesToday,
      icon: CalendarX,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'نسبة التغطية',
      value: `${stats.coverageRate}%`,
      icon: CheckCircle,
      color: stats.coverageRate >= 70 ? 'text-accent' : 'text-destructive',
      bgColor: stats.coverageRate >= 70 ? 'bg-accent/10' : 'bg-destructive/10',
    },
    {
      title: 'إجمالي الغيابات',
      value: stats.absencesTotal,
      icon: CalendarX,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ]

  const recentAbsences = useMemo(() => {
    if (!absences || !schedules) return []
    
    const allTeachers = schedules.flatMap((s) => s.teachers)
    
    return (absences || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((absence) => ({
        ...absence,
        teacherName: allTeachers.find((t) => t.id === absence.teacherId)?.name || 'غير معروف',
        substituteName: absence.substituteTeacherId
          ? allTeachers.find((t) => t.id === absence.substituteTeacherId)?.name
          : null,
      }))
  }, [absences, schedules])

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">التقرير الإحصائي</h1>
        <p className="text-muted-foreground mb-8">
          نظرة شاملة على البيانات والإحصاءات
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats.warnings.length > 0 && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <WarningCircle className="w-5 h-5" />
                تحذيرات وملاحظات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {stats.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <WarningCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>الغيابات الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAbsences.length > 0 ? (
              <div className="space-y-3">
                {recentAbsences.map((absence) => (
                  <div
                    key={absence.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{absence.teacherName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {new Date(absence.date).toLocaleDateString('ar-SA')}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <div className="flex gap-1">
                          {absence.periods.map((p) => (
                            <Badge key={p} variant="outline" className="text-xs">
                              حصة {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      {absence.substituteName ? (
                        <Badge variant="default" className="bg-accent">
                          البديل: {absence.substituteName}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">بدون بديل</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا يوجد غيابات مسجلة
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
