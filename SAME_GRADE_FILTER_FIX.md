# إصلاح وتفعيل زر "نفس الصف" في نظام الحصص الاحتياطية

## 📋 نظرة عامة

تم تفعيل وإصلاح زر "نفس الصف" (Same Grade Filter) بشكل كامل في صفحة غياب المعلمين. الزر الآن يعمل بشكل صحيح ويعرض المعلمين الذين يدرّسون نفس الصف الدراسي للمعلم الغائب.

## 🔧 التغييرات التقنية

### 1. إصلاح XML Parser (`src/lib/xmlParser.ts`)

#### المشكلة السابقة
- كان يتم تحليل بيانات `TimeTableSchedule` من ملف XML
- لكن لم يتم تحويل هذه البيانات إلى `Period[]` مع معلومات `className`
- نتيجة لذلك، لم تكن معلومات الصف متاحة للفلترة

#### الحل المطبق

**تغيير 1: تخزين أوقات الحصص في Map**
```typescript
// قبل: كان يتم إنشاء Period فارغة
const periodElements = xmlDoc.querySelectorAll('period')
periodElements.forEach((periodEl) => {
  periods.push({
    id: `${schoolId}-period-${period}`,
    day: '',
    periodNumber: parseInt(period) || 0,
    teacherId: '',
    subject: '',
    startTime: starttime,
    endTime: endtime,
  })
})

// بعد: تخزين الأوقات في Map لاستخدامها لاحقاً
const periodTimings = new Map<number, { startTime: string; endTime: string }>()
const periodElements = xmlDoc.querySelectorAll('period')
periodElements.forEach((periodEl) => {
  const period = periodEl.getAttribute('period') || '0'
  const starttime = periodEl.getAttribute('starttime') || ''
  const endtime = periodEl.getAttribute('endtime') || ''

  periodTimings.set(parseInt(period) || 0, {
    startTime: starttime,
    endTime: endtime,
  })
})
```

**تغيير 2: ملء periods من TimeTableSchedule مع className**
```typescript
scheduleElements.forEach((scheduleEl, index) => {
  // ... استخراج البيانات من XML ...

  // إضافة إلى schedules
  schedules.push({
    id: `${schoolId}-schedule-${index}`,
    dayID,
    period: parseInt(period) || 0,
    // ... بقية الحقول
  })

  // ✨ جديد: إنشاء Period كامل مع معلومات الصف
  const day = days.find((d) => d.day === dayID)
  const subject = subjects.find((s) => s.originalId === subjectGradeID)
  const classObj = classes.find((c) => c.originalId === classID)
  const timing = periodTimings.get(parseInt(period) || 0)

  periods.push({
    id: `${schoolId}-period-${index}`,
    day: day?.name || '',
    periodNumber: parseInt(period) || 0,
    teacherId: `${schoolId}-${teacherID}`,
    subject: subject?.name || '',
    className: classObj?.name || '',  // ⭐ المعلومة الأساسية لفلتر "نفس الصف"
    startTime: timing?.startTime || '',
    endTime: timing?.endTime || '',
  })
})
```

### 2. تحسين دالة `getAbsentTeacherGrade()` (`src/components/AbsencePage.tsx`)

#### التحسينات
- إضافة console.log لمساعدة في التشخيص
- التعامل مع حالات متعددة من الصفوف لنفس المعلم
- إرجاع أول صف تم العثور عليه

```typescript
function getAbsentTeacherGrade(): string | null {
  if (!selectedTeacherId || approvedSchedules.length === 0 || selectedPeriods.length === 0) return null
  
  const gradesFound = new Set<string>()
  
  for (const schedule of approvedSchedules) {
    if (!schedule.periods || !Array.isArray(schedule.periods)) continue
    
    for (const period of schedule.periods) {
      if (period.teacherId === selectedTeacherId && 
          period.day === selectedDay && 
          selectedPeriods.includes(period.periodNumber) &&
          period.className) {
        gradesFound.add(period.className)
      }
    }
  }
  
  if (gradesFound.size > 0) {
    const grades = Array.from(gradesFound)
    console.log('Grades found for absent teacher:', grades)
    return grades[0]  // إرجاع أول صف
  }
  
  return null
}
```

### 3. تحسين واجهة المستخدم

#### إضافة رسائل توضيحية
```typescript
// عند تفعيل فلتر "نفس الصف"
{filterMode === 'grade' && getAbsentTeacherGrade() && (
  <div className="text-xs text-muted-foreground bg-purple-50 border border-purple-200 px-3 py-2 rounded-md">
    🏫 عرض المعلمين المتفرغين الذين يدرّسون نفس الصف: <span className="font-medium text-foreground">{getAbsentTeacherGrade()}</span>
    <div className="mt-1 text-[10px]">
      📌 المعلمون المعروضون يدرّسون هذا الصف (أي مادة) ومتفرغون في الوقت المطلوب
    </div>
  </div>
)}

// عندما لا يكون هناك صف محدد (الزر معطل)
{!getAbsentTeacherGrade() && selectedTeacherId && selectedPeriods.length > 0 && (
  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
    ℹ️ لم يتم العثور على صف محدد للمعلم في الحصص المختارة. الزر "نفس الصف" معطل.
  </div>
)}
```

#### إضافة tooltip للزر
```typescript
<Button
  type="button"
  variant={filterMode === 'grade' ? 'default' : 'outline'}
  size="sm"
  onClick={() => setFilterMode('grade')}
  className="flex-1 gap-2"
  disabled={!getAbsentTeacherGrade()}
  title={!getAbsentTeacherGrade() ? 'لا يوجد صف محدد للمعلم في الحصص المختارة' : ''}
>
  <GraduationCap className="w-4 h-4" />
  نفس الصف
</Button>
```

## 🎯 كيفية عمل الفلتر

### آلية العمل خطوة بخطوة

1. **المستخدم يختار معلم غائب** → النظام يحدد ID المعلم
2. **المستخدم يختار الحصص** → النظام يحدد أرقام الحصص
3. **النظام يبحث عن الصف**:
   ```
   - يفتش في جميع الـ periods
   - يبحث عن periods حيث:
     * teacherId = المعلم الغائب
     * day = اليوم المختار
     * periodNumber = ضمن الحصص المختارة
   - يستخرج className من هذه الـ periods
   ```
4. **عند الضغط على زر "نفس الصف"**:
   ```
   - النظام يجمع جميع المعلمين الذين يدرّسون نفس الصف
   - يفلتر هؤلاء المعلمين حسب التفرغ:
     * لا حصة في نفس الوقت
     * لا حصة قبل الحصة المختارة
     * لا حصة بعد الحصة المختارة
   - يعرض القائمة النهائية
   ```

### مثال عملي

**السيناريو:**
- المعلم الغائب: أ. محمد (يدرّس الصف 11 علمي)
- اليوم: الأحد
- الحصة: 3

**عند الضغط على "نفس الصف":**
```
1. النظام يحدد أن أ. محمد يدرّس "11 علمي" في الحصة 3 يوم الأحد
2. النظام يبحث عن جميع المعلمين الذين يدرّسون "11 علمي" (أي مادة)
3. من هؤلاء المعلمين، يفلتر فقط من:
   - ليس لديه حصة في الحصة 3 يوم الأحد
   - ليس لديه حصة في الحصة 2 (قبلها)
   - ليس لديه حصة في الحصة 4 (بعدها)
4. يعرض القائمة النهائية مع عددهم
```

## ✅ معايير النجاح

- [x] الزر "نفس الصف" يظهر بشكل صحيح
- [x] الزر معطل عندما لا يكون هناك صف للمعلم الغائب
- [x] الزر يعمل عند الضغط عليه
- [x] الفلترة تتم بشكل صحيح (نفس الصف + متفرغ)
- [x] العدد يتحدث تلقائياً عند التبديل بين الفلاتر
- [x] رسائل توضيحية تظهر للمستخدم
- [x] console.log يساعد في التشخيص
- [x] التوثيق كامل وواضح

## 🔍 اختبار الميزة

### خطوات الاختبار
1. ارفع ملف XML يحتوي على معلمين وصفوف
2. اعتمد الجدول
3. انتقل إلى صفحة "غياب المعلمين"
4. اختر معلم غائب
5. اختر يوم وحصة
6. انقر على زر "نفس الصف"
7. تحقق من:
   - ظهور الرسالة التوضيحية باسم الصف
   - عرض المعلمين المتفرغين الذين يدرّسون نفس الصف
   - العدد الصحيح للمعلمين المتفرغين

### حالات خاصة للاختبار
- **لا يوجد صف**: الزر معطل ورسالة توضيحية تظهر
- **لا يوجد معلمين متفرغين**: رسالة "لا يوجد معلمين متفرغين" تظهر
- **التبديل بين الفلاتر**: العدد والقائمة تتحدث فوراً

## 📊 الفرق بين الأزرار الثلاثة

| الزر | الوظيفة | متى يُستخدم |
|------|---------|-------------|
| **الجدول العام** | يعرض جميع المعلمين المتفرغين | عندما لا يهم التخصص أو الصف |
| **نفس المادة** | يعرض المعلمين الذين يدرّسون نفس المادة | عندما تحتاج بديل من نفس التخصص |
| **نفس الصف** | يعرض المعلمين الذين يدرّسون نفس الصف | عندما تحتاج بديل يعرف طلاب الصف |

## 🎓 فوائد استخدام "نفس الصف"

1. **المعلم البديل يعرف الطلاب** - سهولة في إدارة الصف
2. **الطلاب يعرفون المعلم البديل** - راحة أكبر للطلاب
3. **توزيع عادل** - فرصة لجميع معلمي الصف للمشاركة
4. **مرونة في المادة** - لا يشترط نفس التخصص

## 🔄 التكامل مع بقية النظام

- ✅ يتكامل مع نظام التفرغ (لا حصة قبل/أثناء/بعد)
- ✅ يتكامل مع نظام التحذيرات (حصة متجاورة)
- ✅ يتكامل مع عداد المعلمين المتفرغين
- ✅ يتكامل مع نظام الإحصائيات
- ✅ يحترم الجداول المعتمدة فقط

## 📝 ملاحظات للمطورين

- `className` في `Period` تُملأ من `classID` في `TimeTableSchedule`
- الفلترة تتم في `availableSubstitutes` useMemo
- الزر معطل عند `!getAbsentTeacherGrade()`
- console.log موجود للمساعدة في التشخيص
- الكود يدعم معلم يدرّس صفوف متعددة (يأخذ الأول)

## 🚀 التحسينات المستقبلية المقترحة

- [ ] عرض جميع الصفوف إذا كان المعلم يدرّس صفوف متعددة في الحصص المختارة
- [ ] إضافة فلتر مركب (نفس المادة + نفس الصف)
- [ ] عرض إحصائيات: كم معلم لكل صف متفرغ
- [ ] حفظ تفضيل المستخدم للفلتر الافتراضي
- [ ] إضافة أيقونة صغيرة بجانب اسم المعلم البديل توضح أنه من نفس الصف

---

**تاريخ الإصلاح:** اليوم  
**الحالة:** ✅ مكتمل وجاهز للاستخدام  
**المطور:** Spark Agent
