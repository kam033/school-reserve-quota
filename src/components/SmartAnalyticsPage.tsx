import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useKV } from '@github/spark/hooks'
import { ScheduleData, Absence, Teacher, Period } from '@/lib/types'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartBar, Users, CheckCircle, WarningCircle, Sparkle, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TeacherDailyLoad {
  teacherId: string
  teacherName: string
  subject: string
  [key: string]: string | number
}

interface SubstituteCandidate {
  teacher: Teacher
  score: number
  reasons: string[]
  isFree: boolean
  hasAdjacentClass: boolean
  sameSubject: boolean
  sameGrade: boolean
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const SUBJECT_COLORS: Record<string, string> = {
  'التربية الإسلامية': '#60A5FA',
  'اللغة العربية': '#F59E0B',
  'الرياضيات': '#10B981',
  'العلوم': '#8B5CF6',
  'الكيمياء': '#EF4444',
  'الفيزياء': '#06B6D4',
  'الأحياء': '#84CC16',
  'اللغة الانجليزية': '#EC4899',
  'التاريخ': '#F97316',
  'الجغرافيا': '#14B8A6',
}

export function SmartAnalyticsPage() {
  const [schedules] = useKV<ScheduleData[]>('schedules', [])
  const [absences] = useKV<Absence[]>('absences', [])
  
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [showComparison, setShowComparison] = useState(false)
  
  const [substituteDay, setSubstituteDay] = useState<string>('الأحد')
  const [substitutePeriod, setSubstitutePeriod] = useState<number>(1)
  const [substituteSubject, setSubstituteSubject] = useState<string>('')
  const [substituteGrade, setSubstituteGrade] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'subject' | 'grade'>('all')
  const [removedTeacherIds, setRemovedTeacherIds] = useState<Set<string>>(new Set())

  const approvedSchedules = useMemo(() => {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return []
    return schedules.filter((s) => s.approved)
  }, [schedules])

  const allTeachers = useMemo(() => {
    if (approvedSchedules.length === 0) return []
    return approvedSchedules.flatMap((schedule) => schedule.teachers || [])
  }, [approvedSchedules])

  const allPeriods = useMemo(() => {
    if (approvedSchedules.length === 0) return []
    return approvedSchedules.flatMap((schedule) => schedule.periods || [])
  }, [approvedSchedules])

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(allTeachers.map((t) => t.subject).filter(Boolean))
    return Array.from(subjects).sort()
  }, [allTeachers])

  const dailyLoadData = useMemo(() => {
    if (allPeriods.length === 0 || allTeachers.length === 0) return []

    const teacherLoads: Map<string, TeacherDailyLoad> = new Map()

    allTeachers.forEach((teacher) => {
      if (selectedSubject !== 'all' && teacher.subject !== selectedSubject) return
      if (selectedTeacherId !== 'all' && teacher.id !== selectedTeacherId) return

      const load: TeacherDailyLoad = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: teacher.subject,
      }

      DAYS.forEach((day) => {
        const dayPeriods = allPeriods.filter(
          (p) => p.teacherId === teacher.id && p.day === day
        )
        load[day] = dayPeriods.length
      })

      teacherLoads.set(teacher.id, load)
    })

    return Array.from(teacherLoads.values())
  }, [allPeriods, allTeachers, selectedSubject, selectedTeacherId])

  const chartData = useMemo(() => {
    if (dailyLoadData.length === 0) return []

    const data = DAYS.map((day) => {
      const dayData: any = { day }
      
      dailyLoadData.forEach((teacher) => {
        dayData[teacher.teacherName] = teacher[day] || 0
      })

      return dayData
    })

    return data
  }, [dailyLoadData])

  const substituteLoadData = useMemo(() => {
    if (!absences || !Array.isArray(absences) || absences.length === 0) return []

    const teacherSubstituteCounts: Map<string, number> = new Map()

    absences.forEach((absence) => {
      if (absence.substituteTeacherId) {
        const count = teacherSubstituteCounts.get(absence.substituteTeacherId) || 0
        teacherSubstituteCounts.set(absence.substituteTeacherId, count + absence.periods.length)
      }
    })

    const totalDays = 30
    const maxPeriodsPerDay = 8

    return allTeachers.map((teacher) => {
      const substituteCount = teacherSubstituteCounts.get(teacher.id) || 0
      const percentage = Math.round((substituteCount / (totalDays * maxPeriodsPerDay)) * 100)
      
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: teacher.subject,
        substituteCount,
        percentage: Math.min(percentage, 100),
      }
    }).sort((a, b) => b.substituteCount - a.substituteCount)
  }, [absences, allTeachers])

  const findBestSubstitutes = useMemo((): SubstituteCandidate[] => {
    if (allTeachers.length === 0 || allPeriods.length === 0) return []

    const busyTeacherIds = new Set<string>()
    const teachersWithAdjacentClasses = new Set<string>()

    allPeriods.forEach((period) => {
      if (period.day === substituteDay && period.periodNumber === substitutePeriod) {
        busyTeacherIds.add(period.teacherId)
      }

      if (period.day === substituteDay && 
          (period.periodNumber === substitutePeriod - 1 || period.periodNumber === substitutePeriod + 1)) {
        teachersWithAdjacentClasses.add(period.teacherId)
      }
    })

    let candidates = allTeachers

    if (filterType === 'subject' && substituteSubject) {
      candidates = candidates.filter((t) => t.subject === substituteSubject)
    } else if (filterType === 'grade' && substituteGrade) {
      const teacherPeriodsInGrade = allPeriods.filter(
        (p) => p.className?.startsWith(substituteGrade)
      ).map((p) => p.teacherId)
      candidates = candidates.filter((t) => teacherPeriodsInGrade.includes(t.id))
    }

    const scoredCandidates: SubstituteCandidate[] = candidates.map((teacher) => {
      let score = 0
      const reasons: string[] = []

      const isFree = !busyTeacherIds.has(teacher.id)
      const hasAdjacentClass = teachersWithAdjacentClasses.has(teacher.id)
      const sameSubject = teacher.subject === substituteSubject
      const sameGrade = false

      if (isFree) {
        score += 5
        reasons.push('✅ متاح في هذه الحصة (+5)')
      } else {
        reasons.push('❌ مشغول في هذه الحصة')
        return {
          teacher,
          score: -100,
          reasons,
          isFree: false,
          hasAdjacentClass: false,
          sameSubject: false,
          sameGrade: false,
        }
      }

      if (sameSubject) {
        score += 3
        reasons.push('✅ نفس المادة (+3)')
      }

      if (sameGrade) {
        score += 2
        reasons.push('✅ نفس الصف (+2)')
      }

      if (hasAdjacentClass) {
        score -= 3
        reasons.push('⚠️ لديه حصة قبل أو بعد مباشرة (-3)')
      }

      const substituteHistory = substituteLoadData.find((s) => s.teacherId === teacher.id)
      if (substituteHistory && substituteHistory.percentage > 40) {
        score -= 2
        reasons.push(`⚠️ نسبة احتياطي مرتفعة (${substituteHistory.percentage}%) (-2)`)
      } else if (substituteHistory && substituteHistory.percentage < 20) {
        score += 1
        reasons.push(`✅ نسبة احتياطي منخفضة (${substituteHistory.percentage}%) (+1)`)
      }

      return {
        teacher,
        score,
        reasons,
        isFree,
        hasAdjacentClass,
        sameSubject,
        sameGrade,
      }
    })

    return scoredCandidates
      .filter((c) => c.score > -100)
      .filter((c) => !removedTeacherIds.has(c.teacher.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [allTeachers, allPeriods, substituteDay, substitutePeriod, substituteSubject, substituteGrade, filterType, substituteLoadData, removedTeacherIds])

  const handleRemoveTeacher = (teacherId: string, teacherName: string) => {
    setRemovedTeacherIds((current) => new Set(current).add(teacherId))
    toast.success(`🗑️ تم حذف ${teacherName} من قائمة الترشيحات بنجاح`)
  }

  const getPercentageColor = (percentage: number): string => {
    if (percentage < 20) return 'text-accent'
    if (percentage < 40) return 'text-amber-500'
    return 'text-destructive'
  }

  const getPercentageBgColor = (percentage: number): string => {
    if (percentage < 20) return 'bg-accent'
    if (percentage < 40) return 'bg-amber-500'
    return 'bg-destructive'
  }

  if (approvedSchedules.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-amber-500/50 bg-amber-50/50">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <p className="text-lg font-medium text-foreground">
                  ⚠️ لا يوجد جدول معتمد
                </p>
                <p className="text-muted-foreground">
                  يرجى رفع ملف XML واعتماده أولاً من صفحة "تحميل الجدول"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkle className="w-8 h-8 text-primary" weight="fill" />
            الرسم البياني الذكي لإدارة الحصص
          </h1>
          <p className="text-muted-foreground">
            تحليل شامل للأحمال التدريسية واختيار المعلم البديل الأمثل
          </p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">
              <ChartBar className="w-4 h-4 ml-2" />
              التحليل البياني
            </TabsTrigger>
            <TabsTrigger value="substitute">
              <Users className="w-4 h-4 ml-2" />
              اختيار البديل الذكي
            </TabsTrigger>
            <TabsTrigger value="fairness">
              <CheckCircle className="w-4 h-4 ml-2" />
              عدالة التوزيع
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الأحمال التدريسية اليومية</CardTitle>
                <CardDescription>
                  عدد الحصص لكل معلم حسب أيام الأسبوع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>المعلم</Label>
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المعلمين</SelectItem>
                        {allTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>المادة</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المواد</SelectItem>
                        {uniqueSubjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>نوع الرسم</Label>
                    <Select 
                      value={showComparison ? 'line' : 'bar'} 
                      onValueChange={(v) => setShowComparison(v === 'line')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">أعمدة</SelectItem>
                        <SelectItem value="line">خطي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {showComparison ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {dailyLoadData.map((teacher, index) => (
                          <Line
                            key={teacher.teacherId}
                            type="monotone"
                            dataKey={teacher.teacherName}
                            stroke={SUBJECT_COLORS[teacher.subject] || `hsl(${index * 50}, 70%, 50%)`}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {dailyLoadData.map((teacher, index) => (
                          <Bar
                            key={teacher.teacherId}
                            dataKey={teacher.teacherName}
                            fill={SUBJECT_COLORS[teacher.subject] || `hsl(${index * 50}, 70%, 50%)`}
                          />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    لا توجد بيانات لعرضها
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="substitute" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkle className="w-5 h-5 text-primary" weight="fill" />
                  نظام الاختيار الذكي للمعلم البديل
                </CardTitle>
                <CardDescription>
                  يقوم النظام بتحليل جميع المعلمين واقتراح الأنسب وفق معايير ذكية
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>اليوم</Label>
                    <Select value={substituteDay} onValueChange={setSubstituteDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الحصة</Label>
                    <Select 
                      value={substitutePeriod.toString()} 
                      onValueChange={(v) => setSubstitutePeriod(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((period) => (
                          <SelectItem key={period} value={period.toString()}>
                            الحصة {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>نوع الفلتر</Label>
                    <Select 
                      value={filterType} 
                      onValueChange={(v: any) => setFilterType(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المعلمين</SelectItem>
                        <SelectItem value="subject">نفس المادة</SelectItem>
                        <SelectItem value="grade">نفس الصف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterType === 'subject' && (
                    <div className="space-y-2">
                      <Label>المادة</Label>
                      <Select value={substituteSubject} onValueChange={setSubstituteSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueSubjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filterType === 'grade' && (
                    <div className="space-y-2">
                      <Label>الصف</Label>
                      <Select value={substituteGrade} onValueChange={setSubstituteGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصف" />
                        </SelectTrigger>
                        <SelectContent>
                          {['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'].map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {findBestSubstitutes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary">
                        {findBestSubstitutes.length} معلم متاح
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        مرتبون حسب الأفضلية
                      </span>
                    </div>

                    {findBestSubstitutes.map((candidate, index) => (
                      <Card 
                        key={candidate.teacher.id}
                        className={`transition-all hover:shadow-md ${
                          index === 0 ? 'border-primary border-2' : ''
                        }`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {index === 0 && (
                                  <Badge variant="default" className="bg-primary">
                                    الأنسب
                                  </Badge>
                                )}
                                <h3 className="font-bold text-lg">{candidate.teacher.name}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {candidate.teacher.subject}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={candidate.score >= 5 ? 'default' : 'secondary'}
                                className="text-lg px-3"
                              >
                                {candidate.score} نقطة
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>⚠️ تأكيد الحذف</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل تريد حذف <strong>{candidate.teacher.name}</strong> من قائمة الترشيحات؟
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveTeacher(candidate.teacher.id, candidate.teacher.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {candidate.reasons.map((reason, i) => (
                              <p key={i} className="text-sm">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-destructive/50">
                    <CardContent className="py-8">
                      <div className="text-center">
                        <WarningCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                        <p className="text-lg font-medium">لا يوجد معلمين متاحين</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          جميع المعلمين مشغولون في هذه الحصة
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fairness" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>عدالة توزيع حصص الاحتياطي</CardTitle>
                <CardDescription>
                  نسبة حصص الاحتياطي لكل معلم - يساعد على ضمان توزيع عادل
                </CardDescription>
              </CardHeader>
              <CardContent>
                {substituteLoadData.length > 0 ? (
                  <div className="space-y-4">
                    {substituteLoadData.map((data) => (
                      <div key={data.teacherId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{data.teacherName}</p>
                            <p className="text-sm text-muted-foreground">{data.subject}</p>
                          </div>
                          <div className="text-left flex items-center gap-2">
                            <Badge variant="outline">
                              {data.substituteCount} حصة
                            </Badge>
                            <Badge 
                              className={getPercentageBgColor(data.percentage)}
                            >
                              {data.percentage}%
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={data.percentage} 
                          className="h-2"
                        />
                        <p className={`text-xs ${getPercentageColor(data.percentage)}`}>
                          {data.percentage < 20 && '🟢 قليل - يمكن إضافة المزيد'}
                          {data.percentage >= 20 && data.percentage < 40 && '🟡 متوسط - توزيع جيد'}
                          {data.percentage >= 40 && '🔴 مرتفع - يفضل تخفيف العبء'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    لا توجد بيانات حصص احتياطي مسجلة
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
