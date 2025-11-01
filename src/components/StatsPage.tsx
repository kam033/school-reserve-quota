import React from 'react'

export function StatsPage() {
  // بيانات وهمية - يمكن لاحقًا ربطها بقاعدة البيانات
  const stats = [
    { title: 'عدد الجداول الإجمالي', value: 27, icon: '📘' },
    { title: 'الجداول المعتمدة', value: 19, icon: '✅' },
    { title: 'الجداول غير المعتمدة', value: 8, icon: '⚠️' },
    { title: 'عدد المعلمين', value: 14, icon: '👨‍🏫' },
    { title: 'عدد الغيابات المسجلة', value: 5, icon: '🚫' },
  ]

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-center">📊 صفحة الإحصائيات</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-4 flex items-center justify-between border border-gray-200"
          >
            <div>
              <div className="text-lg font-semibold text-gray-700">{stat.title}</div>
              <div className="text-2xl font-bold text-emerald-600">{stat.value}</div>
            </div>
            <div className="text-3xl">{stat.icon}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-500 text-center">
        * هذه الإحصائيات لأغراض العرض فقط ويمكن أن تتغير ديناميكياً لاحقاً.
      </div>
    </div>
  )
}
