'use client'

import { useEffect } from 'react'

/**
 * Component that adds hover highlighting to admin list table rows
 * for improved user experience. Injects CSS that highlights rows
 * when the cursor is over them.
 */
export function RowHoverHighlight() {
  useEffect(() => {
    // Create and inject stylesheet for row hover effects
    const style = document.createElement('style')
    style.textContent = `
      /* Highlight table rows on hover */
      table[data-testid*="table"] tbody tr:hover {
        background-color: var(--theme-elevation-100);
        transition: background-color 0.15s ease-in-out;
      }

      /* Ensure smooth transitions */
      table[data-testid*="table"] tbody tr {
        transition: background-color 0.15s ease-in-out;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup: remove stylesheet when component unmounts
      document.head.removeChild(style)
    }
  }, [])

  return null
}
