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

  const normalizeToUTF8 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    let text = ''
    const encodings = ['utf-8', 'windows-1256', 'iso-8859-6']
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true })
        text = decoder.decode(uint8Array)
        if (text.includes('<?xml') && !text.includes('�')) {
          break
        }
      } catch {
        continue
      }
    }
    
    if (!text || text.includes('�')) {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(uint8Array)
    }
    
    text = text.replace(/\uFFFD/g, '')
    text = text.replace(/�/g, '')
    text = text.replace(/^\uFEFF/, '')
    
    const encoder = new TextEncoder()
    const utf8Bytes = encoder.encode(text)
    const utf8Decoder = new TextDecoder('utf-8')
    return utf8Decoder.decode(utf8Bytes)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setParseResult(null)
    toast.info('⏳ جارٍ قراءة الملف وتحويله تلقائيًا إلى UTF-8 بدون BOM...')

    try {
      const content = await normalizeToUTF8(file)
      
      if (!content || content.trim().length === 0) {
        toast.error('❌ الملف فارغ أو لا يمكن قراءته')
        setUploading(false)
        return
      }
      
      toast.info('⏳ جارٍ تحليل بيانات المعلمين والحصص...')
      
      const schoolId = `school-${Date.now()}`
      const result = parseXMLFile(content, schoolId)

      setParseResult({
        errors: result.errors,
        warnings: result.warnings,
      })

      if (result.success && result.data) {
        setSchedules((current) => [...(current || []), result.data!])
        toast.success(
          `✅ تم تحويل الملف ورفعه بنجاح! تم استخراج ${result.data.teachers.length} معلم و ${result.data.schedules?.length || 0} حصة`
        )
      } else {
        toast.error('❌ فشل رفع الملف. يرجى مراجعة الأخطاء')
      }
      
      setUploading(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      toast.error(`❌ حدث خطأ أثناء معالجة الملف: ${errorMessage}`)
      setParseResult({
        errors: [errorMessage],
        warnings: []
      })
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📂 نظام رفع ملفات XML</h1>
          <p className="text-muted-foreground mb-8">
            قم باختيار ملف XML من aSc TimeTables - سيتم تحويله تلقائيًا إلى UTF-8 بدون BOM وإزالة أي رموز غير مفهومة
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
              <Card className="bg-accent/5 border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    معالجة تلقائية للترميز
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-accent font-bold">1.</span>
                      <p>قراءة محتوى الملف بأي ترميز (UTF-8، ANSI، Windows-1256، أو غيره)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent font-bold">2.</span>
                      <p>تحويل الملف داخليًا إلى ترميز UTF-8 بدون BOM لضمان ظهور الحروف العربية بشكل سليم</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent font-bold">3.</span>
                      <p>إزالة أي رموز غير مفهومة (����) إن وُجدت</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent font-bold">4.</span>
                      <p>رفع النسخة النظيفة وتحليل بيانات المعلمين والحصص بشكل صحيح</p>
                    </div>
                    <div className="mt-4 p-3 bg-background rounded border">
                      <p className="font-medium text-primary">✨ لا يحتاج المستخدم إلى تعديل الترميز يدويًا في Notepad++ — النظام يتولى ذلك تلقائيًا</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📂 رفع ملف XML</CardTitle>
                  <CardDescription>
                    النظام يقرأ الملف بأي ترميز ويحوله تلقائيًا إلى UTF-8 بدون BOM - لا حاجة للتعديل اليدوي
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
