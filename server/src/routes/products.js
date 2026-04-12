import { Router } from 'express'
import { ProductController } from '../controllers/ProductController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.get('/',     ProductController.list)
router.post('/',    ProductController.create)
router.get('/:id',  ProductController.get)
router.put('/:id',  ProductController.update)
router.delete('/:id', ProductController.delete)

export default router
