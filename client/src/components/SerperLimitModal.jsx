import { AlertTriangle, ExternalLink, RefreshCw, Zap, CheckCircle, XCircle } from 'lucide-react'

const SERPER_URL   = 'https://serper.dev'
const SERPAPI_URL  = 'https://serpapi.com'
const BING_URL     = 'https://portal.azure.com'

/**
 * Modal exibido quando o limite de créditos do Serper é atingido.
 *
 * Props:
 *   onClose          — () => void
 *   resetDate        — string ISO (opcional)
 *   serpapiAvailable — boolean — SerpAPI configurada como fallback
 *   bingAvailable    — boolean — Bing Search configurado como fallback
 */
export function SerperLimitModal({ onClose, resetDate, serpapiAvailable = false, bingAvailable = false }) {
  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  let resetLabel = null
  if (resetDate) {
    try {
      resetLabel = new Date(resetDate).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    } catch { /* ignora */ }
  }

  const anyFallback = serpapiAvailable || bingAvailable

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-amber-600/40 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        {/* Cabeçalho */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-900/40">
            <AlertTriangle size={30} className="text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">Créditos Serper esgotados</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Você usou todos os créditos disponíveis na API Serper.
              {resetLabel
                ? <> Renovação prevista para <span className="text-amber-300 font-semibold">{resetLabel}</span>.</>
                : <> O plano free renova no dia 1 do próximo mês.</>
              }
            </p>
          </div>
        </div>

        {/* Status dos fallbacks — ordem: SerpAPI → Bing */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status dos fallbacks</p>

          {/* SerpAPI */}
          <div className={`rounded-xl p-3 text-sm flex items-start gap-3 ${
            serpapiAvailable
              ? 'bg-emerald-900/30 border border-emerald-700/40'
              : 'bg-zinc-800 border border-zinc-700'
          }`}>
            {serpapiAvailable
              ? <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              : <XCircle    size={14} className="text-zinc-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-medium text-xs ${serpapiAvailable ? 'text-emerald-300' : 'text-zinc-400'}`}>
                SerpAPI {serpapiAvailable ? '— ativo (100 buscas/mês grátis)' : '— não configurado'}
              </p>
              {!serpapiAvailable && (
                <p className="text-zinc-500 text-xs mt-0.5">
                  Configure <code className="text-zinc-300">SERPAPI_KEY</code> em Configurações.
                </p>
              )}
            </div>
          </div>

          {/* Bing */}
          <div className={`rounded-xl p-3 text-sm flex items-start gap-3 ${
            bingAvailable
              ? 'bg-sky-900/30 border border-sky-700/40'
              : 'bg-zinc-800 border border-zinc-700'
          }`}>
            {bingAvailable
              ? <CheckCircle size={14} className="text-sky-400 shrink-0 mt-0.5" />
              : <XCircle    size={14} className="text-zinc-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`font-medium text-xs ${bingAvailable ? 'text-sky-300' : 'text-zinc-400'}`}>
                Bing Search {bingAvailable ? '— ativo (1.000 buscas/mês grátis)' : '— não configurado'}
              </p>
              {!bingAvailable && (
                <p className="text-zinc-500 text-xs mt-0.5">
                  Configure <code className="text-zinc-300">BING_SEARCH_KEY</code> no Azure.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* O que fazer */}
        <div className="bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-zinc-200">O que você pode fazer:</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li className="flex items-start gap-2">
              <RefreshCw size={13} className="text-sky-400 shrink-0 mt-0.5" />
              Aguardar a renovação{resetLabel ? ` em ${resetLabel}` : ' mensal'}
            </li>
            <li className="flex items-start gap-2">
              <Zap size={13} className="text-amber-400 shrink-0 mt-0.5" />
              Assinar plano pago no Serper para continuar agora
            </li>
            {!serpapiAvailable && (
              <li className="flex items-start gap-2">
                <ExternalLink size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                Configurar SerpAPI (gratuito, 100 buscas/mês — mais fácil)
              </li>
            )}
            {!bingAvailable && (
              <li className="flex items-start gap-2">
                <ExternalLink size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                Configurar Bing Search (gratuito, 1.000 buscas/mês — via Azure)
              </li>
            )}
          </ul>
        </div>

        {/* Botões */}
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
          {!serpapiAvailable && (
            <a
              href={SERPAPI_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center flex items-center justify-center gap-2 text-sm bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 rounded-lg px-4 py-2"
              onClick={onClose}
            >
              <ExternalLink size={13} /> Criar conta grátis no SerpAPI
            </a>
          )}
          {!bingAvailable && (
            <a
              href={BING_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center flex items-center justify-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-4 py-2"
              onClick={onClose}
            >
              <ExternalLink size={13} /> Configurar Bing no Azure
            </a>
          )}
          <button className="btn-ghost w-full text-sm" onClick={onClose}>
            {anyFallback ? 'Continuar com fallback ativo' : 'Aguardar renovação'}
          </button>
        </div>

      </div>
    </div>
  )
}
