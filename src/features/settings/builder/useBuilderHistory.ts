import { useState } from 'react'
import type { FooterBuilder } from '../types'

export function useBuilderHistory(initial: FooterBuilder) {
  const [history, setHistory] = useState({
    past: [] as FooterBuilder[],
    present: initial,
    future: [] as FooterBuilder[],
  })
  const commit = (next: FooterBuilder) =>
    setHistory((current) =>
      JSON.stringify(next) === JSON.stringify(current.present)
        ? current
        : {
            past: [...current.past.slice(-49), current.present],
            present: next,
            future: [],
          }
    )
  const undo = () =>
    setHistory((current) =>
      !current.past.length
        ? current
        : {
            past: current.past.slice(0, -1),
            present: current.past.at(-1)!,
            future: [current.present, ...current.future],
          }
    )
  const redo = () =>
    setHistory((current) =>
      !current.future.length
        ? current
        : {
            past: [...current.past, current.present],
            present: current.future[0],
            future: current.future.slice(1),
          }
    )
  return {
    value: history.present,
    commit,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
  }
}

export type BuilderHistory = ReturnType<typeof useBuilderHistory>
