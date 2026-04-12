import { Router } from 'express'
import { StatusController } from '../controllers/StatusController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)

router.get('/',     StatusController.list)
router.get('/:id',  StatusController.get)
router.post('/',    StatusController.create)
router.put('/:id',  StatusController.update)
router.delete('/:id', StatusController.delete)

export default router
