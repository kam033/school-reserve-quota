import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { User, UserRole } from './types'

interface AuthContextType {
  currentUser: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isAdmin: boolean
  isDirector: boolean
  isTeacher: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'admin123',
    role: 'admin' as UserRole,
    name: 'مدير النظام',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useKV<User | null>('current-user', null)
  const [users, setUsers] = useKV<User[]>('users', [])

  useEffect(() => {
    if (!users || users.length === 0) {
      setUsers(DEFAULT_USERS)
    }
  }, [])

  const login = (username: string, password: string): boolean => {
    const userList = users || []
    const user = userList.find(
      (u) => u.username === username && u.password === password
    )
    if (user) {
      setCurrentUser(user)
      return true
    }
    return false
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const value: AuthContextType = {
    currentUser: currentUser || null,
    login,
    logout,
    isAdmin: currentUser?.role === 'admin',
    isDirector: currentUser?.role === 'director',
    isTeacher: currentUser?.role === 'teacher',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
