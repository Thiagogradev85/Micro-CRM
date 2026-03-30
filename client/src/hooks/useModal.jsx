import { useState, useCallback } from 'react'
import { AppModal } from '../components/AppModal.jsx'

/**
 * Hook central de modais do sistema.
 *
 * Em qualquer página:
 *   const { modal, showModal } = useModal()
 *   return <div>{modal} ...</div>
 *
 * Alertas:
 *   showModal({ type: 'success' | 'error' | 'warning' | 'info', title, message })
 *
 * Confirmações:
 *   showModal({
 *     type: 'warning',
 *     title: 'Excluir?',
 *     message: 'Esta ação não pode ser desfeita.',
 *     actions: [
 *       { label: 'Excluir', variant: 'danger', onClick: () => doDelete() },
 *     ],
 *   })
 */
export function useModal() {
  const [state, setState] = useState(null)

  const showModal = useCallback(({ type = 'info', title, message, details = [], actions } = {}) => {
    setState({ type, title, message, details, actions })
  }, [])

  const closeModal = useCallback(() => setState(null), [])

  const modal = state
    ? <AppModal {...state} onClose={closeModal} />
    : null

  return { modal, showModal, closeModal }
}
