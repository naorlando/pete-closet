// ── Color utilities ────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number): number => {
    let tc = t
    if (tc < 0) tc += 1
    if (tc > 1) tc -= 1
    if (tc < 1 / 6) return p + (q - p) * 6 * tc
    if (tc < 1 / 2) return q
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6
    return p
  }
  return [
    Math.round(channel(hn + 1 / 3) * 255),
    Math.round(channel(hn) * 255),
    Math.round(channel(hn - 1 / 3) * 255),
  ]
}

function hueDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// ── Module-level cache ─────────────────────────────────────────────────────────

const colorizeCache = new Map<string, string>()

// ── Core colorize function ─────────────────────────────────────────────────────

export function colorizeImage(
  src: string,
  targetHue: number,
  baseHue: number,
  tolerance = 38,
): Promise<string> {
  const key = `${src}|${targetHue}|${baseHue}`
  if (colorizeCache.has(key)) return Promise.resolve(colorizeCache.get(key)!)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 20) continue // skip transparent pixels
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
        if (s > 0.12 && hueDiff(h, baseHue) < tolerance) {
          const [nr, ng, nb] = hslToRgb(targetHue, s, l)
          d[i] = nr
          d[i + 1] = ng
          d[i + 2] = nb
        }
      }
      ctx.putImageData(imageData, 0, 0)
      const url = canvas.toDataURL('image/webp', 0.85)
      colorizeCache.set(key, url)
      resolve(url)
    }
    img.onerror = () => resolve(src) // fallback to original on error
    img.src = src
  })
}

// ── Cache read helper (synchronous) ───────────────────────────────────────────

export function getCachedColorizedImage(
  src: string,
  targetHue: number,
  baseHue: number,
): string | undefined {
  const key = `${src}|${targetHue}|${baseHue}`
  return colorizeCache.get(key)
}
