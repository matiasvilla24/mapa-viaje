import { useEffect, useRef } from 'react'

// Salida evidente de vistas modales (HIG modality.md / sheets.md):
// - Tecla Escape (desktop)
// - Swipe hacia abajo desde la cabecera del sheet (móvil)
// - Botón de cerrar con target táctil ≥ 44×44 (accessibility.md)
//
// Uso:
//   const sheet = useSheetDismiss(onClose)
//   <div className="sheet" {...sheet.handlers}> … <SheetClose onClick={onClose} /> …
//   (opcional) <div className="sheet-grabber" /> arriba del contenido
export function useSheetDismiss(onClose) {
  const startY = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handlers = {
    onTouchStart: (e) => { startY.current = e.touches[0]?.clientY ?? null },
    onTouchEnd: (e) => {
      if (startY.current == null) return
      const dy = (e.changedTouches[0]?.clientY ?? 0) - startY.current
      startY.current = null
      if (dy > 90) onCloseRef.current() // swipe hacia abajo decidido
    },
  }
  return { handlers }
}

// Botón de cerrar estándar de los sheets: círculo gris al estilo iOS,
// 36 px visible con 44 px de área táctil, etiqueta para lectores de pantalla.
export function SheetClose({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Cerrar"
      className="flex-shrink-0 -m-2 p-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 active:bg-slate-100 transition-colors"
    >
      <span
        className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-bold text-base leading-none"
        aria-hidden="true"
      >
        ✕
      </span>
    </button>
  )
}
