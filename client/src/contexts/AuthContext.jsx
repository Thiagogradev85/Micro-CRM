import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { usePresence } from '../hooks/usePresence.js'
import { Toast } from '../components/Toast.jsx'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaura sessão a partir do cookie httpOnly ao montar
  useEffect(() => {
    api.me()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.login(email, password)
    setUser(data.user)
    return data
  }

  async function logout() {
    await api.logout().catch(() => {})
    setUser(null)
  }

  const { onlineUserIds, presenceToast, clearToast } = usePresence(user)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, onlineUserIds }}>
      {children}

      {/* Toast de presença — aparece só para admin quando outro usuário entra */}
      {presenceToast && (
        <Toast
          message={`${presenceToast.nome} está online`}
          type="success"
          onClose={clearToast}
        />
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
