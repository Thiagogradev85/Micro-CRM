import { Router } from 'express'
import { SellerController } from '../controllers/SellerController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)

router.get('/',       SellerController.list)
router.get('/:id',    SellerController.get)
router.post('/',      SellerController.create)
router.put('/:id',    SellerController.update)
router.delete('/:id', SellerController.delete)

export default router
