import { useSyncExternalStore } from 'react'
import { getMeta, subscribeMeta } from './meta'
export const useMeta = () => useSyncExternalStore(subscribeMeta, getMeta)
