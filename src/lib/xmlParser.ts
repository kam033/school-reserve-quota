import { Teacher, Period, ScheduleData } from './types'

export interface ParseResult {
  success: boolean
  data?: ScheduleData
  errors: string[]
  warnings: string[]
}

export function parseXMLFile(xmlContent: string, schoolId: string): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const teachers: Teacher[] = []
  const periods: Period[] = []

  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      errors.push('ملف XML غير صالح. تحقق من صحة الملف.')
      return { success: false, errors, warnings }
    }

    if (!xmlContent.includes('<?xml') || !xmlContent.toLowerCase().includes('utf-8')) {
      warnings.push('تحذير: الملف قد لا يحتوي على ترميز UTF-8. قد تظهر الأحرف العربية بشكل خاطئ.')
    }

    const teacherElements = xmlDoc.querySelectorAll('teacher')
    const teacherIds = new Set<string>()
    const teacherNames = new Set<string>()

    teacherElements.forEach((teacherEl) => {
      const id = teacherEl.getAttribute('id') || ''
      const name = teacherEl.getAttribute('name') || ''
      const subject = teacherEl.getAttribute('subject') || ''

      if (!id || !name) {
        warnings.push(`معلم بدون معرف أو اسم تم تجاهله`)
        return
      }

      if (teacherIds.has(id)) {
        warnings.push(`تكرار المعرف: ${id} للمعلم ${name}`)
      }

      if (teacherNames.has(name)) {
        warnings.push(`تكرار الاسم: ${name}`)
      }

      if (name.includes('�') || name.includes('?')) {
        warnings.push(`مشكلة في الترميز: ${name} - يُرجى حفظ الملف بترميز UTF-8`)
      }

      teacherIds.add(id)
      teacherNames.add(name)

      teachers.push({
        id: `${schoolId}-${id}`,
        name,
        subject,
        schoolId,
      })
    })

    const lessonElements = xmlDoc.querySelectorAll('lesson, card')
    lessonElements.forEach((lessonEl, index) => {
      const teacherId = lessonEl.getAttribute('teacherid') || 
                        lessonEl.getAttribute('teacher') || ''
      const day = lessonEl.getAttribute('day') || 
                  lessonEl.getAttribute('days') || ''
      const period = lessonEl.getAttribute('period') || '0'
      const subject = lessonEl.getAttribute('subject') || ''
      const className = lessonEl.getAttribute('class') || ''

      if (teacherId && day) {
        const days = day.split(',')
        const periodStrs = period.split(',')

        days.forEach((d) => {
          periodStrs.forEach((p) => {
            const periodNum = parseInt(p) || 1
            periods.push({
              id: `period-${schoolId}-${index}-${d}-${periodNum}`,
              day: d.trim(),
              periodNumber: periodNum,
              teacherId: `${schoolId}-${teacherId}`,
              subject,
              className,
            })
          })
        })
      }
    })

    if (teachers.length === 0) {
      errors.push('لم يتم العثور على أي معلمين في الملف')
    }

    const scheduleData: ScheduleData = {
      teachers,
      periods,
      schoolId,
      uploadDate: new Date().toISOString(),
    }

    return {
      success: errors.length === 0,
      data: scheduleData,
      errors,
      warnings,
    }
  } catch (error) {
    errors.push(`خطأ في قراءة الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    return { success: false, errors, warnings }
  }
}

export function validateXMLEncoding(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target?.result as string
      const result = parseXMLFile(content, 'temp')
      resolve(result)
    }

    reader.onerror = () => {
      resolve({
        success: false,
        errors: ['فشل في قراءة الملف'],
        warnings: [],
      })
    }

    reader.readAsText(file, 'UTF-8')
  })
}
