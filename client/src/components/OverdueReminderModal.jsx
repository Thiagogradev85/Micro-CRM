import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { formatDate } from '../utils/constants'

/**
 * Modal de lembrete exibido uma vez por dia quando há clientes
 * sem contato há mais de 3 dias.
 *
 * Props:
 *   clients — array de clientes em atraso (retorno de GET /clients/overdue)
 *   onClose — () => void
 */
export function OverdueReminderModal({ clients, onClose }) {
  const navigate = useNavigate()

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleClientClick(id) {
    navigate(`/clients/${id}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">

        {/* Cabeçalho */}
        <div className="flex items-start gap-3 p-5 border-b border-zinc-700">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-900/40 shrink-0">
            <AlertTriangle size={22} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-100 text-base leading-tight">
              Clientes sem contato recente
            </h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              {clients.length} cliente{clients.length > 1 ? 's' : ''} sem contato há mais de 3 dias
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de clientes */}
        <ul className="overflow-y-auto flex-1 divide-y divide-zinc-800">
          {clients.map(c => (
            <li
              key={c.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800 cursor-pointer transition-colors"
              onClick={() => handleClientClick(c.id)}
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-zinc-100 truncate block">{c.nome}</span>
                {c.cidade && (
                  <span className="text-xs text-zinc-500">{c.cidade}/{c.uf}</span>
                )}
              </div>
              <span className="text-xs text-amber-500 font-medium shrink-0 ml-3">
                {c.ultimo_contato ? formatDate(c.ultimo_contato) : 'Nunca contatado'}
              </span>
            </li>
          ))}
        </ul>

        {/* Rodapé */}
        <div className="p-4 border-t border-zinc-700">
          <button className="btn-primary w-full" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
