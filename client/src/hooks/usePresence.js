import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

/**
 * Conecta ao socket e gerencia presença.
 * Só ativo quando o usuário está autenticado.
 *
 * @param {object|null} user  - usuário logado (do AuthContext)
 * @returns {{ onlineUserIds: string[], presenceToast: {nome} | null, clearToast: fn }}
 */
export function usePresence(user) {
  const socketRef                       = useRef(null)
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [presenceToast, setPresenceToast] = useState(null) // { nome }

  useEffect(() => {
    if (!user) {
      // Desconecta ao fazer logout
      socketRef.current?.disconnect()
      socketRef.current = null
      setOnlineUserIds([])
      return
    }

    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    // Admin recebe lista inicial de quem já está online
    socket.on('online-users', (ids) => {
      setOnlineUserIds(ids.map(String))
    })

    // Usuário entrou
    socket.on('user-online', ({ userId, nome }) => {
      setOnlineUserIds(prev => [...new Set([...prev, String(userId)])])
      if (user.role === 'admin') {
        setPresenceToast({ nome })
      }
    })

    // Usuário saiu
    socket.on('user-offline', ({ userId }) => {
      setOnlineUserIds(prev => prev.filter(id => id !== String(userId)))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  return {
    onlineUserIds,
    presenceToast,
    clearToast: () => setPresenceToast(null),
  }
}
