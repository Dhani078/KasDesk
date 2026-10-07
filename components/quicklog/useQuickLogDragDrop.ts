import { useState } from 'react'

export function useQuickLogDragDrop() {
  const [isDragging, setIsDragging] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      window.dispatchEvent(new CustomEvent('kasdesk:scan-file', { detail: file }))
    }
  }

  return { isDragging, handleDragOver, handleDragLeave, handleDrop }
}
