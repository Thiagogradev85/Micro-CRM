import { SellerModel } from '../models/SellerModel.js'
import { AppError } from '../utils/AppError.js'

export const SellerController = {
  async list(req, res, next) {
    try {
      const data = await SellerModel.list(req.user.id)
      res.json(data)
    } catch (err) { next(err) }
  },

  async get(req, res, next) {
    try {
      const data = await SellerModel.get(req.params.id, req.user.id)
      if (!data) throw new AppError('Vendedor não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const data = await SellerModel.create(req.body, req.user.id)
      res.status(201).json(data)
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const data = await SellerModel.update(req.params.id, req.body, req.user.id)
      if (!data) throw new AppError('Vendedor não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async delete(req, res, next) {
    try {
      await SellerModel.delete(req.params.id, req.user.id)
      res.status(204).end()
    } catch (err) { next(err) }
  },
}
