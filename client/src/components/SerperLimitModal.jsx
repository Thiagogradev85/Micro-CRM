import { AlertTriangle, ExternalLink, RefreshCw, Zap } from 'lucide-react'

const SERPER_URL = 'https://serper.dev'
const BING_GUIDE_URL = 'https://portal.azure.com'

/**
 * Modal exibido quando o limite de créditos do Serper é atingido.
 *
 * Props:
 *   onClose      — () => void
 *   resetDate    — string ISO (opcional) — data calculada de renovação dos créditos
 *   cseAvailable — boolean — indica se o fallback Bing está ativo
 */
export function SerperLimitModal({ onClose, resetDate, cseAvailable }) {
  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Formata data de renovação
  let resetLabel = null
  if (resetDate) {
    try {
      resetLabel = new Date(resetDate).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    } catch { /* ignora */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-amber-600/40 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-900/40">
            <AlertTriangle size={30} className="text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">Créditos Serper esgotados</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Você usou todos os créditos disponíveis na API Serper.
              {resetLabel
                ? <> A renovação está prevista para <span className="text-amber-300 font-semibold">{resetLabel}</span>.</>
                : <> O plano free renova no dia 1 do próximo mês.</>
              }
            </p>
          </div>
        </div>

        {/* Status do fallback */}
        <div className={`rounded-xl p-3.5 text-sm flex items-start gap-3 ${
          cseAvailable
            ? 'bg-emerald-900/30 border border-emerald-700/40'
            : 'bg-zinc-800 border border-zinc-700'
        }`}>
          <Zap size={15} className={`shrink-0 mt-0.5 ${cseAvailable ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div>
            {cseAvailable ? (
              <>
                <p className="font-medium text-emerald-300">Bing Search ativo como fallback</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  O enriquecimento continua funcionando com até 1.000 buscas/mês via Bing Search API.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-zinc-300">Fallback Bing Search não configurado</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Configure <code className="text-zinc-300">BING_SEARCH_KEY</code> no servidor para continuar buscando gratuitamente (1.000/mês).
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-zinc-200">O que você pode fazer:</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li className="flex items-start gap-2">
              <RefreshCw size={13} className="text-sky-400 shrink-0 mt-0.5" />
              Aguardar a renovação{resetLabel ? ` em ${resetLabel}` : ' mensal'}
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              Assinar um plano pago no Serper para continuar agora
            </li>
            {!cseAvailable && (
              <li className="flex items-start gap-2">
                <ExternalLink size={13} className="text-amber-400 shrink-0 mt-0.5" />
                Configurar Bing Search (gratuito, 1.000 buscas/mês)
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={SERPER_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full text-center flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <ExternalLink size={15} /> Ver planos no Serper.dev
          </a>
          {!cseAvailable && (
            <a
              href={BING_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="btn w-full text-center flex items-center justify-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              onClick={onClose}
            >
              <ExternalLink size={13} /> Configurar Bing Search no Azure
            </a>
          )}
          <button className="btn-ghost w-full text-sm" onClick={onClose}>
            {cseAvailable ? 'Continuar com Google CSE' : 'Aguardar renovação'}
          </button>
        </div>

      </div>
    </div>
  )
}
