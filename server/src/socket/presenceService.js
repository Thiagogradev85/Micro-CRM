import { verifyToken } from '../utils/auth.js'

// userId → { nome, role, socketId }
const onlineUsers = new Map()

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const idx = c.indexOf('=')
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))]
      })
  )
}

function broadcastToAdmins(io, event, data) {
  for (const [, info] of onlineUsers) {
    if (info.role === 'admin') {
      io.to(info.socketId).emit(event, data)
    }
  }
}

export function setupPresence(io) {
  // ── Auth middleware para sockets ──────────────────────
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie)
      const token = cookies.token
      if (!token) return next(new Error('Não autenticado'))
      socket.user = verifyToken(token)
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const { id: userId, nome, role } = socket.user

    // Registra como online
    onlineUsers.set(String(userId), { nome, role, socketId: socket.id })

    // Admin recebe lista atual de online ao conectar
    if (role === 'admin') {
      socket.emit('online-users', [...onlineUsers.keys()])
    }

    // Notifica admins quando usuário (não-admin) entra
    if (role !== 'admin') {
      broadcastToAdmins(io, 'user-online', { userId: String(userId), nome })
    }

    socket.on('disconnect', () => {
      onlineUsers.delete(String(userId))

      // Notifica admins quando usuário sai
      if (role !== 'admin') {
        broadcastToAdmins(io, 'user-offline', { userId: String(userId) })
      }
    })
  })
}

export function getOnlineUserIds() {
  return [...onlineUsers.keys()]
}
