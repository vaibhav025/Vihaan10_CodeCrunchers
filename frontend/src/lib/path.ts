// The level path. Phase 1 has Zone 1 playable; Zone 2 shows as locked beyond its banner.
export type NodeType = 'lesson' | 'chest' | 'boss' | 'story'
export interface PathNode { id: string; type: NodeType; zone: number; n: number; size: number }

/** Questions per node. Lessons are 3; the checkpoint is 5. */
export const NODES: PathNode[] = [
  { id: 'z1-1', type: 'lesson', zone: 1, n: 1, size: 3 },
  { id: 'z1-2', type: 'lesson', zone: 1, n: 2, size: 3 },
  { id: 'z1-3', type: 'chest', zone: 1, n: 0, size: 0 },
  { id: 'z1-4', type: 'story', zone: 1, n: 0, size: 0 },
  { id: 'z1-5', type: 'lesson', zone: 1, n: 3, size: 3 },
  { id: 'z1-6', type: 'boss', zone: 1, n: 0, size: 5 },
  { id: 'z2-1', type: 'lesson', zone: 2, n: 1, size: 3 },
  { id: 'z2-2', type: 'lesson', zone: 2, n: 2, size: 3 },
  { id: 'z2-3', type: 'chest', zone: 2, n: 0, size: 0 },
]
export const CHEST_COINS = 20
export const LESSON_COINS = 10

export type NodeState = 'completed' | 'current' | 'locked'
export function nodeStates(done: Record<string, number>): NodeState[] {
  const current = NODES.findIndex(n => !done[n.id])
  return NODES.map((n, i) => (done[n.id] ? 'completed' : i === current ? 'current' : 'locked'))
}

/** Perfect run = 3 stars, 1-2 mistakes = 2, otherwise 1. */
export const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1)
