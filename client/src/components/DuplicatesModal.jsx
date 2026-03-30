import { CopyX, Loader2, Trash2, X } from 'lucide-react'
import { statusPill } from '../utils/constants.js'

/**
 * Modal de verificação de duplicatas de clientes.
 * Props:
 *   state    — null | { loading: true } | { groups: [] }
 *   onClose  — () => void
 *   onDelete — (client, groupIndex) => void
 *   navigate — fn de react-router
 */
export function DuplicatesModal({ state, onClose, onDelete, navigate }) {
  if (!state) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div>
            <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
              <CopyX size={18} className="text-amber-400" /> Verificação de Duplicatas
            </h2>
            {!state.loading && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {state.groups.length === 0
                  ? 'Nenhuma duplicata encontrada.'
                  : `${state.groups.length} grupo${state.groups.length !== 1 ? 's' : ''} de possíveis duplicatas`}
              </p>
            )}
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {state.loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 size={32} className="animate-spin text-sky-400" />
              <p className="text-zinc-400 text-sm">Analisando clientes...</p>
            </div>
          ) : state.groups.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-emerald-400 font-medium">Nenhuma duplicata encontrada!</p>
              <p className="text-zinc-500 text-sm mt-1">Todos os clientes parecem únicos.</p>
            </div>
          ) : (
            state.groups.map((group, gi) => (
              <div key={gi} className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="bg-zinc-800 px-4 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Grupo {gi + 1} — {group.length} registros similares
                </div>
                <div className="divide-y divide-zinc-700/50">
                  {group.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <button
                          className="text-sky-400 hover:text-sky-300 font-medium text-sm text-left"
                          onClick={() => { onClose(); navigate(`/clients/${c.id}`) }}
                        >
                          {c.nome}
                        </button>
                        <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {c.cidade && <span>{c.cidade}{c.uf ? `/${c.uf}` : ''}</span>}
                          {c.whatsapp && <span className="text-green-500">{c.whatsapp}</span>}
                          {c.status_nome && <span style={statusPill(c.status_cor)}>{c.status_nome}</span>}
                        </div>
                      </div>
                      <button
                        className="btn-danger btn-sm flex-shrink-0"
                        onClick={() => onDelete(c, gi)}
                        title="Excluir permanentemente este registro"
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
