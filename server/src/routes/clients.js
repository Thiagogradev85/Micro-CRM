import { Router } from 'express'
import { ClientController } from '../controllers/ClientController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)

// Rotas estáticas — devem vir ANTES das rotas com /:id
router.post('/import',                        ClientController.importExcel)
router.get('/export',                         ClientController.exportClients)
router.get('/overdue',                        ClientController.getOverdue)
router.get('/duplicates',                     ClientController.findDuplicates)
router.get('/ufs',                            ClientController.listUFs)

router.get('/',                               ClientController.list)
router.get('/:id',                            ClientController.get)
router.post('/',                              ClientController.create)
router.put('/:id',                            ClientController.update)
router.delete('/:id',                         ClientController.delete)

// Compra — registra evento no relatório diário
router.post('/:id/purchase',                  ClientController.registerPurchase)

// Observações
router.get('/:id/observations',               ClientController.listObservations)
router.post('/:id/observations',              ClientController.addObservation)
router.delete('/:id/observations/:obsId',     ClientController.deleteObservation)

export default router
