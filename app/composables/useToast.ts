export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

let nextId = 1

export function useToast() {
  const items = useState<ToastItem[]>('toast-items', () => [])

  function push(message: string, tone: ToastItem['tone'] = 'info') {
    const id = nextId++
    items.value = [...items.value, { id, message, tone }]
    setTimeout(() => {
      items.value = items.value.filter(item => item.id !== id)
    }, tone === 'error' ? 6000 : 3500)
  }

  return {
    items,
    info: (message: string) => push(message, 'info'),
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
  }
}
