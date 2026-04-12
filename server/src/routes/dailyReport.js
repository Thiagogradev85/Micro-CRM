import { Router } from 'express'
import { DailyReportController } from '../controllers/DailyReportController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)

router.get('/summary',       DailyReportController.getSummary)
router.get('/details',       DailyReportController.getDetails)
router.get('/dates',         DailyReportController.listDates)
router.get('/pdf',           DailyReportController.downloadPdf)
router.delete('/events/:id', DailyReportController.deleteEvent)

export default router
