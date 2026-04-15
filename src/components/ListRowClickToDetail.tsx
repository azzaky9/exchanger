'use client'

import { useEffect } from 'react'

function isInteractiveTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      'a, button, input, select, textarea, label, summary, [role="button"], [data-no-row-nav]',
    ),
  )
}

export function ListRowClickToDetail() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      if (!target) return
      if (isInteractiveTarget(target)) return

      const row = target.closest('tr')
      if (!row) return

      const detailLink = row.querySelector<HTMLAnchorElement>('a[href*="/collections/"]')
      if (!detailLink?.href) return

      // Keep native browser behavior for modifier clicks.
      if (event.metaKey || event.ctrlKey) {
        window.open(detailLink.href, '_blank', 'noopener,noreferrer')
        return
      }

      window.location.assign(detailLink.href)
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}
