export type UserRole = 'admin' | 'director' | 'teacher'

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  schoolId?: string
  name: string
}

export interface Teacher {
  id: string
  name: string
  subject: string
  schoolId: string
}

export interface Period {
  id: string
  day: string
  periodNumber: number
  teacherId: string
  subject: string
  className?: string
}

export interface Absence {
  id: string
  teacherId: string
  date: string
  periods: number[]
  substituteTeacherId?: string
  schoolId: string
}

export interface School {
  id: string
  name: string
  xmlData?: string
}

export interface ScheduleData {
  teachers: Teacher[]
  periods: Period[]
  schoolId: string
  uploadDate: string
}

export interface DashboardStats {
  totalTeachers: number
  totalSubjects: number
  totalPeriods: number
  absencesToday: number
  coverageRate: number
  warnings: string[]
}
