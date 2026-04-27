import { Router } from 'express'
import { login, logout, me, listUsers, createUser, updateUser, deleteUser,
         forgotPassword, resetPassword } from '../controllers/AuthController.js'
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/login',  login)
router.post('/logout', requireAuth, logout)
router.get('/me',      requireAuth, me)

// Redefinição de senha via e-mail (rotas públicas)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password',  resetPassword)

// Admin — gestão de usuários
router.get   ('/users',     requireAuth, requireAdmin, listUsers)
router.post  ('/users',     requireAuth, requireAdmin, createUser)
router.put   ('/users/:id', requireAuth, requireAdmin, updateUser)
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser)

export default router
