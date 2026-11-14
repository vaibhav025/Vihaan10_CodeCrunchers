/** Future You, drawn on a canvas: an older figure in a forest coat. `t` drives the leg swing; `air` tucks the legs. */
export function drawFutureYou(c: CanvasRenderingContext2D, x: number, footY: number, t: number, air: boolean, s = 1, tired = false) {
  const swing = air ? 0.5 : Math.sin(t * 14) * 0.6
  c.save(); c.translate(x, footY); c.scale(s, s)
  if (tired) c.rotate(0.12)
  c.fillStyle = '#5A5148'
  for (const d of [-1, 1]) { c.save(); c.translate(d * 4, -18); c.rotate(d * swing); c.fillRect(-3, 0, 6, 18); c.restore() }
  c.fillStyle = '#4C6A58'; c.beginPath(); c.roundRect(-9, -40, 18, 24, 4); c.fill()
  c.fillStyle = '#C4673A'; c.fillRect(-9, -40, 18, 4) // scarf
  c.fillStyle = '#D9B99B'; c.beginPath(); c.arc(0, -47, 7, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#E4E4DE'; c.beginPath(); c.arc(0, -49, 7, Math.PI, 0); c.fill()
  c.restore()
}
