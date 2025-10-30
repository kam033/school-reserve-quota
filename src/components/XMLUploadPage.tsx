import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { CloudArrowUp, WarningCircle, CheckCircle, BookOpen } from '@phosphor-icons/react'
import { parseXMLFile } from '@/lib/xmlParser'
import { ScheduleData } from '@/lib/types'
import { XMLGuide } from '@/components/XMLGuide'

export function XMLUploadPage() {
  const [schedules, setSchedules] = useKV<ScheduleData[]>('schedules', [])
  const [uploading, setUploading] = useState(false)
  const [parseResult, setParseResult] = useState<{
    errors: string[]
    warnings: string[]
  } | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setParseResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const content = event.target?.result as string
        const schoolId = `school-${Date.now()}`
        const result = parseXMLFile(content, schoolId)

        setParseResult({
          errors: result.errors,
          warnings: result.warnings,
        })

        if (result.success && result.data) {
          setSchedules((current) => [...(current || []), result.data!])
          toast.success(
            `تم رفع الجدول بنجاح! تم استخراج ${result.data.teachers.length} معلم`
          )
        } else {
          toast.error('فشل رفع الملف. يرجى مراجعة الأخطاء')
        }
        
        setUploading(false)
      }

      reader.onerror = () => {
        toast.error('خطأ في قراءة الملف')
        setUploading(false)
      }

      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      toast.error('حدث خطأ غير متوقع')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">تحميل الجدول الدراسي</h1>
          <p className="text-muted-foreground mb-8">
            قم برفع ملف XML المستخرج من برنامج aSc Timetables
          </p>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <CloudArrowUp className="w-4 h-4 ml-2" />
                رفع الملف
              </TabsTrigger>
              <TabsTrigger value="guide">
                <BookOpen className="w-4 h-4 ml-2" />
                دليل التحضير
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>رفع ملف XML</CardTitle>
                  <CardDescription>
                    يجب أن يكون الملف محفوظاً بترميز UTF-8
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 bg-muted/20">
                    <CloudArrowUp className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">اسحب الملف هنا أو اضغط للاختيار</p>
                    <p className="text-sm text-muted-foreground mb-4">XML فقط</p>
                    <input
                      type="file"
                      accept=".xml"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="xml-file"
                      disabled={uploading}
                    />
                    <label htmlFor="xml-file">
                      <Button disabled={uploading} asChild>
                        <span>{uploading ? 'جاري الرفع...' : 'اختيار ملف'}</span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {parseResult && (
                <div className="space-y-4">
                  {parseResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <WarningCircle className="h-5 w-5" />
                      <AlertDescription>
                        <p className="font-medium mb-2">أخطاء:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {parseResult.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {parseResult.warnings.length > 0 && (
                    <Alert>
                      <WarningCircle className="h-5 w-5" />
                      <AlertDescription>
                        <p className="font-medium mb-2">تحذيرات:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {parseResult.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {parseResult.errors.length === 0 && parseResult.warnings.length === 0 && (
                    <Alert className="bg-accent/10 border-accent">
                      <CheckCircle className="h-5 w-5 text-accent" />
                      <AlertDescription>
                        تم رفع الملف بنجاح بدون أخطاء أو تحذيرات!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>الجداول المرفوعة</CardTitle>
                </CardHeader>
                <CardContent>
                  {schedules && schedules.length > 0 ? (
                    <div className="space-y-3">
                      {schedules.map((schedule, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">مدرسة {i + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              {schedule.teachers.length} معلم • {schedule.schedules?.length || 0} حصة
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(schedule.uploadDate).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      لم يتم رفع أي جداول بعد
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guide">
              <XMLGuide />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
