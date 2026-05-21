import { useState, useEffect, useRef } from 'react'

import roomBg from './assets/room-background.png'

// Base Pete — always visible, never changes
import peteBase from './assets/pete/pete-base.png'
import peteNoArms from './assets/pete/pete-no-arms.png'
import peteNoFeet from './assets/pete/pete-no-feet.png'
import peteNoArmsNoFeet from './assets/pete/pete-no-arms-no-feet.png'

// Layers (transparent PNGs, same 1086×1448 canvas as base)
import layerJeans from './assets/layers/layer-jeans.png'
import layerShirt from './assets/layers/layer-shirt.png'
import layerPyjamas from './assets/layers/layer-pyjamas.png'
import layerTrainers from './assets/layers/layer-trainers.png'
import layerSocks from './assets/layers/layer-socks.png'
import layerSocksLeft from './assets/layers/layer-socks-left.png'
import layerSocksRight from './assets/layers/layer-socks-right.png'
import layerCowboyBoots from './assets/layers/layer-cowboy-boots.png'
import layerHat from './assets/layers/layer-hat.png'
import layerScarf from './assets/layers/layer-scarf.png'

// Thumbnail for socks closet display
import thumbSocksCloset from './assets/thumbnails/thumb-socks-closet.png'

// Tight-cropped closet thumbnails
import closetShirt   from './assets/thumbnails/closet-shirt.png'
import closetJeans   from './assets/thumbnails/closet-jeans.png'
import closetPyjamas from './assets/thumbnails/closet-pyjamas.png'
import closetTrainers from './assets/thumbnails/closet-trainers.png'
import closetSocks   from './assets/thumbnails/closet-socks.png'
import closetBoots   from './assets/thumbnails/closet-cowboy-boots.png'
import closetHat     from './assets/thumbnails/closet-hat.png'
import closetScarf   from './assets/thumbnails/closet-scarf.png'

// ── Types ──────────────────────────────────────────────────────────────────────

const SLOT = {
  FEET:  'feet',
  LEGS:  'legs',
  TORSO: 'torso',
  BODY:  'body',
  NECK:  'neck',
  HEAD:  'head',
} as const

type SlotId = (typeof SLOT)[keyof typeof SLOT]

interface ClothingItem {
  id: string
  word: string      // vocabulary word: TRAINERS, JEANS, SHIRT…
  label: string     // subtitle: "red trainers"
  slot: SlotId
  layer: string     // transparent PNG layer, stacked on Pete
  thumbnail: string // shown in closet
  closetThumbnail?: string // tight-cropped thumbnail for closet display
  isShoe?: boolean  // true → bottom shelf, not rod
  isSplit?: boolean // true → render as two independent left/right layers
  defaultAdjustment?: Partial<LayerAdjustment> // per-item position/scale override applied on equip
  layerZ?: number   // overrides default slot z-index when rendering
  closetHeight?: string // per-item height override in the closet display
}

// AdjustmentKey covers regular slots + split sub-slots
type AdjustmentKey = SlotId | 'feet-left' | 'feet-right'

interface DragState {
  item: ClothingItem
  x: number
  y: number
  wasEquipped: boolean  // dragging off Pete to remove
}

interface VocabWord {
  word: string
  label: string
}

interface LayerAdjustment {
  x: number
  y: number
  scale: number
  rotate: number
}

interface DebugDragState {
  slotId: AdjustmentKey
  startPointerX: number
  startPointerY: number
  startAdjX: number
  startAdjY: number
}

interface ClosetAdjDragState {
  id: string
  startPointerX: number
  startPointerY: number
  startAdjX: number
  startAdjY: number
}

type ClosetItemAdjustment = { x: number; y: number; scale: number }

// ── Item definitions ───────────────────────────────────────────────────────────

const ITEMS: ClothingItem[] = [
  // TORSO — hangs on rod
  {
    id: 'shirt',
    word: 'SHIRT',
    label: 'a yellow shirt',
    slot: SLOT.TORSO,
    layer: layerShirt,
    thumbnail: layerShirt,
    closetThumbnail: closetShirt,
    closetHeight: 'calc(551px * 0.22)',
    defaultAdjustment: { x: 16, y: 11, scale: 1.10, rotate: 0 },
  },
  // LEGS — hang on rod
  {
    id: 'jeans',
    word: 'JEANS',
    label: 'blue jeans',
    slot: SLOT.LEGS,
    layer: layerJeans,
    thumbnail: layerJeans,
    closetThumbnail: closetJeans,
    closetHeight: 'calc(551px * 0.32)',
    defaultAdjustment: { x: 6, y: 66, scale: 0.85, rotate: 0 },
  },
  // BODY — full outfit, hangs on rod, overrides legs + torso
  {
    id: 'pyjamas',
    word: 'PYJAMAS',
    label: 'fish pyjamas',
    slot: SLOT.BODY,
    layer: layerPyjamas,
    thumbnail: layerPyjamas,
    closetThumbnail: closetPyjamas,
    closetHeight: 'calc(551px * 0.30)',
    defaultAdjustment: { x: 14, y: 9, scale: 1.00, rotate: 0 },
  },
  // HEAD — hat (middle shelf)
  {
    id: 'hat',
    word: 'HAT',
    label: 'a striped hat',
    slot: SLOT.HEAD,
    layer: layerHat,
    thumbnail: layerHat,
    closetThumbnail: closetHat,
    closetHeight: 'calc(551px * 0.15)',
    defaultAdjustment: { x: 48, y: -50, scale: 1.15, rotate: 0 },
  },
  // NECK — scarf (middle shelf)
  {
    id: 'scarf',
    word: 'SCARF',
    label: 'a red scarf',
    slot: SLOT.NECK,
    layer: layerScarf,
    thumbnail: layerScarf,
    closetThumbnail: closetScarf,
    closetHeight: 'calc(551px * 0.15)',
    defaultAdjustment: { x: -20, y: 27, scale: 1.15, rotate: 0 },
  },
  // FEET — bottom boxes
  {
    id: 'trainers',
    word: 'TRAINERS',
    label: 'red trainers',
    slot: SLOT.FEET,
    layer: layerTrainers,
    thumbnail: layerTrainers,
    closetThumbnail: closetTrainers,
    closetHeight: 'calc(551px * 0.18)',
    isShoe: true,
    defaultAdjustment: { x: 2, y: 5, scale: 1.10, rotate: 0 },
  },
  {
    id: 'socks',
    word: 'SOCKS',
    label: 'mismatched socks',
    slot: SLOT.FEET,
    layer: layerSocks,
    thumbnail: thumbSocksCloset,
    closetThumbnail: closetSocks,
    closetHeight: 'calc(551px * 0.07)',
    isShoe: true,
    isSplit: true,
    layerZ: 1,
  },
  {
    id: 'cowboy-boots',
    word: 'BOOTS',
    label: 'cowboy boots',
    slot: SLOT.FEET,
    layer: layerCowboyBoots,
    thumbnail: layerCowboyBoots,
    closetThumbnail: closetBoots,
    closetHeight: 'calc(551px * 0.18)',
    isShoe: true,
    defaultAdjustment: { x: 2, y: 20, scale: 1.10, rotate: 0 },
  },
]

// Closet zone grouping by slot
const HANGING_ITEMS     = ITEMS.filter(i => i.slot === SLOT.TORSO || i.slot === SLOT.LEGS || i.slot === SLOT.BODY)
const MIDDLE_SHELF_ITEMS = ITEMS.filter(i => i.slot === SLOT.HEAD || i.slot === SLOT.NECK)
const BOTTOM_BOX_ITEMS  = ITEMS.filter(i => i.slot === SLOT.FEET)

const DEFAULT_ADJUSTMENT: LayerAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 }

const DEFAULT_ADJUSTMENTS: Record<AdjustmentKey, LayerAdjustment> = {
  feet:         { x: 2, y: 5, scale: 1.10, rotate: 0 },
  'feet-left':  { x: 5, y: 64, scale: 0.85, rotate: 0 },
  'feet-right': { x: -1, y: 64, scale: 0.85, rotate: 0 },
  legs:         { x: 6, y: 66, scale: 0.85, rotate: 0 },
  torso:        { x: 16, y: 11, scale: 1.10, rotate: 0 },
  body:         { x: 14, y: 9, scale: 1.00, rotate: 0 },
  neck:         { x: -20, y: 27, scale: 1.15, rotate: 0 },
  head:         { x: 48, y: -50, scale: 1.15, rotate: 0 },
}

// ── Hanger SVG ─────────────────────────────────────────────────────────────────

function Hanger() {
  return (
    <svg width="36" height="32" viewBox="0 0 32 28" fill="none">
      <path
        d="M16 2 C16 2 16 8 16 10 C16 12 8 16 4 20"
        stroke="#92400e"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="4" y1="20" x2="28" y2="20" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Closet: all 3 zones ────────────────────────────────────────────────────────

interface ClosetProps {
  equippedIds: Set<string>
  draggingId: string | undefined
  hoveredId: string | undefined
  debugMode: boolean
  closetAdjustments: Record<string, ClosetItemAdjustment>
  onPointerDown: (item: ClothingItem, e: React.PointerEvent) => void
  onPointerEnter: (id: string) => void
  onPointerLeave: () => void
  onClosetAdjPointerDown: (id: string, e: React.PointerEvent) => void
}

const HARD_OUTLINE =
  'drop-shadow(0 2px 0 white) drop-shadow(0 -2px 0 white) ' +
  'drop-shadow(2px 0 0 white) drop-shadow(-2px 0 0 white) ' +
  'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) ' +
  'drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'

function Closet({
  equippedIds,
  draggingId,
  hoveredId,
  debugMode,
  closetAdjustments,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onClosetAdjPointerDown,
}: ClosetProps) {
  // Horizontal bounds of the closet area (fraction of screen width)
  const CLOSET_LEFT  = 0.685
  const CLOSET_RIGHT = 0.910

  function itemGlowStyle(item: ClothingItem): React.CSSProperties {
    const isEquipped = equippedIds.has(item.id)
    const isHovered  = hoveredId === item.id
    const isDragging = draggingId === item.id

    if (isDragging) {
      return {}
    }
    if (isHovered || isEquipped) {
      return { filter: HARD_OUTLINE }
    }
    return {}
  }

  // ── Top rod: hanging clothes ──────────────────────────────────────────────

  const hangingItems = HANGING_ITEMS.map((item, i) => {
    const isDragging = draggingId === item.id
    const xPct = CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (i + 0.5)) / HANGING_ITEMS.length
    const cadj = closetAdjustments[item.id] ?? { x: 0, y: 0, scale: 1 }

    return (
      <div
        key={item.id}
        className="absolute"
        style={{
          left: `${xPct * 100}%`,
          top: '38%',
          transform: `translateX(-50%)`,
          opacity: isDragging ? 0.15 : 1,
          transition: 'opacity 0.2s',
          cursor: debugMode ? 'move' : 'grab',
          touchAction: 'none',
          overflow: 'visible',
        }}
        onPointerDown={e => {
          e.preventDefault()
          if (debugMode) {
            onClosetAdjPointerDown(item.id, e)
          } else {
            onPointerDown(item, e)
          }
        }}
        onPointerEnter={() => { if (!debugMode) onPointerEnter(item.id) }}
        onPointerLeave={() => { if (!debugMode) onPointerLeave() }}
      >
        <div
          className="flex flex-col items-center"
          style={{
            transform: `translate(${cadj.x}px, ${cadj.y}px) scale(${cadj.scale})`,
            transformOrigin: 'top center',
          }}
        >
          <Hanger />
          <img
            src={item.closetThumbnail ?? item.thumbnail}
            alt={item.word}
            className="object-contain -mt-1"
            style={{
              height: item.closetHeight ?? 'calc(551px * 0.9)',
              width: 'auto',
              ...itemGlowStyle(item),
              transition: 'filter 0.15s',
            }}
            draggable={false}
          />
        </div>
        {debugMode && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-black/70 text-yellow-300 px-1 rounded pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            {item.id} {Math.round(cadj.x)},{Math.round(cadj.y)} s{cadj.scale.toFixed(2)}
          </div>
        )}
      </div>
    )
  })

  // ── Middle shelf: hat + scarf ─────────────────────────────────────────────

  const middleItems = MIDDLE_SHELF_ITEMS.map((item, i) => {
    const isDragging = draggingId === item.id
    const xPct = CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (i + 0.5)) / MIDDLE_SHELF_ITEMS.length
    const cadj = closetAdjustments[item.id] ?? { x: 0, y: 0, scale: 1 }

    return (
      <div
        key={item.id}
        className="absolute flex items-end justify-center"
        style={{
          left: `${xPct * 100}%`,
          top: '52%',
          transform: `translateX(-50%)`,
          opacity: isDragging ? 0.15 : 1,
          transition: 'opacity 0.2s',
          cursor: debugMode ? 'move' : 'grab',
          touchAction: 'none',
          position: 'absolute',
          overflow: 'visible',
        }}
        onPointerDown={e => {
          e.preventDefault()
          if (debugMode) {
            onClosetAdjPointerDown(item.id, e)
          } else {
            onPointerDown(item, e)
          }
        }}
        onPointerEnter={() => { if (!debugMode) onPointerEnter(item.id) }}
        onPointerLeave={() => { if (!debugMode) onPointerLeave() }}
      >
        <img
          src={item.closetThumbnail ?? item.thumbnail}
          alt={item.word}
          className="object-contain"
          style={{
            height: item.closetHeight ?? 'calc(551px * 0.9)',
            width: 'auto',
            transform: `translate(${cadj.x}px, ${cadj.y}px) scale(${cadj.scale})`,
            ...itemGlowStyle(item),
            transition: 'filter 0.15s',
          }}
          draggable={false}
        />
        {debugMode && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-black/70 text-yellow-300 px-1 rounded pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            {item.id} {Math.round(cadj.x)},{Math.round(cadj.y)} s{cadj.scale.toFixed(2)}
          </div>
        )}
      </div>
    )
  })

  // ── Bottom boxes: trainers (left), socks (center), boots (right) ──────────

  // Fixed positions for the 3 boxes
  const BOX_POSITIONS = [0.700, 0.790, 0.885]

  const bottomItems = BOTTOM_BOX_ITEMS.map((item, i) => {
    const isDragging = draggingId === item.id
    const xPct = BOX_POSITIONS[i] ?? CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (i + 0.5)) / BOTTOM_BOX_ITEMS.length
    const cadj = closetAdjustments[item.id] ?? { x: 0, y: 0, scale: 1 }

    return (
      <div
        key={item.id}
        className="absolute flex items-end justify-center"
        style={{
          left: `${xPct * 100}%`,
          top: '72%',
          transform: `translateX(-50%)`,
          opacity: isDragging ? 0.15 : 1,
          transition: 'opacity 0.2s',
          cursor: debugMode ? 'move' : 'grab',
          touchAction: 'none',
          overflow: 'visible',
        }}
        onPointerDown={e => {
          e.preventDefault()
          if (debugMode) {
            onClosetAdjPointerDown(item.id, e)
          } else {
            onPointerDown(item, e)
          }
        }}
        onPointerEnter={() => { if (!debugMode) onPointerEnter(item.id) }}
        onPointerLeave={() => { if (!debugMode) onPointerLeave() }}
      >
        <img
          src={item.closetThumbnail ?? item.thumbnail}
          alt={item.word}
          className="object-contain"
          style={{
            height: item.closetHeight ?? 'calc(551px * 0.9)',
            width: 'auto',
            transform: `translate(${cadj.x}px, ${cadj.y}px) scale(${cadj.scale})`,
            ...itemGlowStyle(item),
            transition: 'filter 0.15s',
          }}
          draggable={false}
        />
        {debugMode && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-black/70 text-yellow-300 px-1 rounded pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            {item.id} {Math.round(cadj.x)},{Math.round(cadj.y)} s{cadj.scale.toFixed(2)}
          </div>
        )}
      </div>
    )
  })

  return (
    <>
      {hangingItems}
      {middleItems}
      {bottomItems}
    </>
  )
}

// ── Pete character: stacked transparent layers ─────────────────────────────────

interface PeteProps {
  peteRef: React.RefObject<HTMLDivElement | null>
  equipped: Record<SlotId, string | null>
  debugMode: boolean
  adjustments: Record<AdjustmentKey, LayerAdjustment>
  selectedSlot: AdjustmentKey | null
  onSelectSlot: (slot: AdjustmentKey) => void
  onDebugPointerDown: (slot: AdjustmentKey, e: React.PointerEvent) => void
  onEquippedPointerDown: (item: ClothingItem, e: React.PointerEvent) => void
}

function Pete({
  peteRef,
  equipped,
  debugMode,
  adjustments,
  selectedSlot,
  onSelectSlot,
  onDebugPointerDown,
  onEquippedPointerDown,
}: PeteProps) {
  // body slot active → override legs + torso (pyjamas mode)
  const equippedBody  = equipped.body  ? ITEMS.find(i => i.id === equipped.body)  : null
  const equippedLegs  = !equippedBody && equipped.legs  ? ITEMS.find(i => i.id === equipped.legs)  : null
  const equippedTorso = !equippedBody && equipped.torso ? ITEMS.find(i => i.id === equipped.torso) : null
  const equippedFeet  = equipped.feet  ? ITEMS.find(i => i.id === equipped.feet)  : null
  const equippedNeck  = equipped.neck  ? ITEMS.find(i => i.id === equipped.neck)  : null
  const equippedHead  = equipped.head  ? ITEMS.find(i => i.id === equipped.head)  : null

  const hideArms = !!(equippedTorso || equippedBody)
  const hideFeet = !!equippedFeet

  const peteImg = hideArms && hideFeet
    ? peteNoArmsNoFeet
    : hideArms
    ? peteNoArms
    : hideFeet
    ? peteNoFeet
    : peteBase

  // Debug logging
  console.log('[Pete] equipped:', JSON.stringify(equipped))
  console.log('[Pete] layers:', {
    feet:  equippedFeet?.word  ?? '—',
    legs:  equippedLegs?.word  ?? '—',
    torso: equippedTorso?.word ?? '—',
    body:  equippedBody?.word  ?? '—',
    neck:  equippedNeck?.word  ?? '—',
    head:  equippedHead?.word  ?? '—',
  })

  function buildLayerStyle(zIndex: number, key: AdjustmentKey): React.CSSProperties {
    const adj = adjustments[key]
    const isSelected = selectedSlot === key
    return {
      zIndex,
      transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`,
      // Always enable pointer events on equipped layers — normal mode needs grab, debug mode needs reposition
      pointerEvents: 'auto' as const,
      cursor: debugMode ? (isSelected ? 'move' : 'pointer') : 'grab',
      ...(debugMode ? {
        outline: isSelected
          ? '2px solid rgba(255,0,0,0.6)'
          : '2px dashed rgba(255,255,0,0.4)',
      } : {
        outline: 'none',
      }),
    }
  }

  // Map an AdjustmentKey back to the ClothingItem it belongs to
  function itemForKey(key: AdjustmentKey): ClothingItem | null {
    // feet-left and feet-right both belong to the feet slot item
    const slotId = key === 'feet-left' || key === 'feet-right' ? SLOT.FEET : key as SlotId
    const itemId = equipped[slotId]
    return itemId ? (ITEMS.find(i => i.id === itemId) ?? null) : null
  }

  function handleLayerPointerDown(key: AdjustmentKey, e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (debugMode) {
      if (selectedSlot !== key) {
        onSelectSlot(key)
      } else {
        onDebugPointerDown(key, e)
      }
    } else {
      // Normal mode: drag the equipped item off Pete
      const item = itemForKey(key)
      if (item) {
        onEquippedPointerDown(item, e)
      }
    }
  }

  return (
    <div
      ref={peteRef}
      className="absolute select-none"
      style={{ left: '38%', bottom: '14%', transform: 'translateX(-50%)' }}
    >
      <div className="relative" style={{ height: '551px', width: 'auto' }}>

        {/* z=1 — Base Pete, always visible */}
        <img
          src={peteImg}
          alt="Pete the Cat"
          className="h-full w-auto object-contain drop-shadow-2xl"
          draggable={false}
        />

        {/* z=2 — Legs layer (jeans / fish-trousers) */}
        {equippedLegs && (
          <img
            key={equippedLegs.id}
            src={equippedLegs.layer}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(2, SLOT.LEGS)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.LEGS, e)}
          />
        )}

        {/* z=3 — Torso layer (shirt) */}
        {equippedTorso && (
          <img
            key={equippedTorso.id}
            src={equippedTorso.layer}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(3, SLOT.TORSO)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.TORSO, e)}
          />
        )}

        {/* z=4 — Body layer (pyjamas — covers legs + torso) */}
        {equippedBody && (
          <img
            key={equippedBody.id}
            src={equippedBody.layer}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(4, SLOT.BODY)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.BODY, e)}
          />
        )}

        {/* z=5 — Feet layer, always on top (socks override to z=1 via layerZ) */}
        {equippedFeet && (equippedFeet.isSplit ? (
          <>
            <img
              key="feet-left"
              src={layerSocksLeft}
              alt=""
              className="absolute inset-0 h-full w-auto object-contain"
              style={buildLayerStyle(equippedFeet.layerZ ?? 5, 'feet-left')}
              draggable={false}
              onPointerDown={e => handleLayerPointerDown('feet-left', e)}
            />
            <img
              key="feet-right"
              src={layerSocksRight}
              alt=""
              className="absolute inset-0 h-full w-auto object-contain"
              style={buildLayerStyle(equippedFeet.layerZ ?? 5, 'feet-right')}
              draggable={false}
              onPointerDown={e => handleLayerPointerDown('feet-right', e)}
            />
          </>
        ) : (
          <img
            key={equippedFeet.id}
            src={equippedFeet.layer}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(equippedFeet.layerZ ?? 5, SLOT.FEET)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.FEET, e)}
          />
        ))}

        {/* z=6 — Neck layer (scarf), below hat */}
        {equippedNeck && (
          <img
            src={equippedNeck.layer}
            style={buildLayerStyle(6, SLOT.NECK)}
            className="absolute inset-0 h-full w-auto object-contain"
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.NECK, e)}
          />
        )}

        {/* z=7 — Head layer (hat), always on top of everything */}
        {equippedHead && (
          <img
            key={equippedHead.id}
            src={equippedHead.layer}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(7, SLOT.HEAD)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.HEAD, e)}
          />
        )}
      </div>
    </div>
  )
}

// ── Ghost drag item (follows cursor) ──────────────────────────────────────────

interface GhostDragProps {
  drag: DragState
}

function GhostDrag({ drag }: GhostDragProps) {
  return (
    <div
      className="absolute pointer-events-none z-50 flex flex-col items-center"
      style={{
        left: drag.x,
        top: drag.y,
        transform: 'translate(-50%, -50%) scale(1.1)',
      }}
    >
      <img
        src={drag.item.thumbnail}
        alt={drag.item.word}
        className="w-28 h-28 object-contain drop-shadow-2xl ring-4 ring-yellow-400 rounded-xl"
        draggable={false}
      />
      <span className="mt-1 text-sm font-black text-white uppercase tracking-wide bg-black/60 rounded-full px-3 py-1">
        {drag.item.word}
      </span>
    </div>
  )
}

// ── Vocabulary badge ───────────────────────────────────────────────────────────

interface VocabBadgeProps {
  word: VocabWord
}

function VocabBadge({ word }: VocabBadgeProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-white/95 border-4 border-yellow-400 rounded-2xl px-6 py-3 shadow-xl text-center z-30 animate-pete-wiggle"
      style={{ bottom: '8%' }}
    >
      <p className="text-3xl font-black text-blue-800 uppercase tracking-widest">
        {word.word}
      </p>
      <p className="text-sm text-blue-400 mt-1">{word.label}</p>
    </div>
  )
}

// ── Debug Panel ────────────────────────────────────────────────────────────────

interface DebugPanelProps {
  equipped: Record<SlotId, string | null>
  adjustments: Record<AdjustmentKey, LayerAdjustment>
  selectedSlot: AdjustmentKey | null
  closetAdjustments: Record<string, ClosetItemAdjustment>
  onAdjustScale: (slot: AdjustmentKey, delta: number) => void
  onAdjustRotate: (slot: AdjustmentKey, delta: number) => void
  onAdjustPosition: (slot: AdjustmentKey, dx: number, dy: number) => void
  onSelectSlot: (slot: AdjustmentKey) => void
  onAdjustClosetItem: (id: string, patch: Partial<ClosetItemAdjustment>) => void
}

const SLOT_ORDER: SlotId[] = [SLOT.BODY, SLOT.TORSO, SLOT.LEGS, SLOT.FEET, SLOT.NECK, SLOT.HEAD]

function DebugPanel({
  equipped,
  adjustments,
  selectedSlot,
  closetAdjustments,
  onAdjustScale,
  onAdjustRotate,
  onAdjustPosition,
  onSelectSlot,
  onAdjustClosetItem,
}: DebugPanelProps) {
  const [layersOpen, setLayersOpen] = useState(true)
  const [closetOpen, setClosetOpen] = useState(false)

  const equippedFeetItem = equipped.feet ? ITEMS.find(i => i.id === equipped.feet) : null
  const feetIsSplit = equippedFeetItem?.isSplit ?? false

  // Build the list of adjustment keys to show in the panel
  const equippedKeys: AdjustmentKey[] = SLOT_ORDER.flatMap(slot => {
    if (equipped[slot] === null) return []
    if (slot === SLOT.FEET && feetIsSplit) return ['feet-left', 'feet-right']
    return [slot]
  })

  if (equippedKeys.length === 0) {
    return (
      <div
        className="absolute left-4 z-50 rounded-lg p-2 text-xs text-white/60"
        style={{ background: 'rgba(0,0,0,0.75)', minWidth: 180, bottom: 60, maxHeight: '70%', overflowY: 'auto' }}
      >
        No layers equipped
      </div>
    )
  }

  return (
    <div
      className="absolute left-4 z-50 rounded-lg p-2 font-mono text-xs"
      style={{ background: 'rgba(0,0,0,0.82)', minWidth: 240, bottom: 60, maxHeight: '70%', overflowY: 'auto' }}
    >
      <p className="text-yellow-400 font-bold mb-1 text-[10px] uppercase tracking-widest">
        Layer Debugger
      </p>

      {/* LAYERS section header */}
      <div
        onClick={() => setLayersOpen(o => !o)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        className="text-white/70 font-bold text-[10px] uppercase tracking-widest mb-1"
      >
        <span>{layersOpen ? '▼' : '▶'}</span>
        <span>LAYERS</span>
      </div>

      {layersOpen && (
        <>
      {/* Column headers */}
      <div className="grid gap-x-2 text-white/40 mb-1" style={{ gridTemplateColumns: '68px 36px 36px 44px 44px 60px' }}>
        <span>SLOT</span>
        <span className="text-right">X</span>
        <span className="text-right">Y</span>
        <span className="text-right">SCALE</span>
        <span className="text-right">ROT</span>
        <span />
      </div>

      {equippedKeys.map(slot => {
        const adj = adjustments[slot]
        const isSelected = selectedSlot === slot

        return (
          <div
            key={slot}
            className="rounded px-1 py-0.5 mb-1 cursor-pointer"
            style={{
              background: isSelected ? 'rgba(255,0,0,0.15)' : 'transparent',
              border: isSelected ? '1px solid rgba(255,0,0,0.4)' : '1px solid transparent',
            }}
            onClick={() => onSelectSlot(slot)}
          >
            <div className="grid gap-x-2 items-center" style={{ gridTemplateColumns: '68px 36px 36px 44px 44px 60px' }}>
              {/* Slot name */}
              <span className={isSelected ? 'text-red-400 font-bold' : 'text-white/80'}>
                {slot}
              </span>

              {/* X */}
              <span className="text-right text-cyan-300">{Math.round(adj.x)}</span>

              {/* Y */}
              <span className="text-right text-cyan-300">{Math.round(adj.y)}</span>

              {/* Scale */}
              <span className="text-right text-green-300">{adj.scale.toFixed(2)}</span>

              {/* Rotate */}
              <span className="text-right text-orange-300">{adj.rotate}°</span>

              {/* Scale buttons */}
              <div className="flex gap-1 justify-end">
                <button
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                  onClick={e => { e.stopPropagation(); onAdjustScale(slot, 0.05) }}
                >
                  +
                </button>
                <button
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                  onClick={e => { e.stopPropagation(); onAdjustScale(slot, -0.05) }}
                >
                  −
                </button>
              </div>
            </div>

            {/* Rotate buttons — always visible per slot */}
            <div className="mt-1 flex items-center gap-1">
              <span className="text-white/40 text-[10px] w-6">ROT</span>
              <button
                className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                onClick={e => { e.stopPropagation(); onAdjustRotate(slot, 1) }}
              >
                ↻
              </button>
              <button
                className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                onClick={e => { e.stopPropagation(); onAdjustRotate(slot, -1) }}
              >
                ↺
              </button>
            </div>

            {/* Arrow nudge buttons — only for selected slot */}
            {isSelected && (
              <div className="mt-1.5 flex flex-col items-center gap-0.5">
                <button
                  className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                  onClick={e => { e.stopPropagation(); onAdjustPosition(slot, 0, -1) }}
                >
                  ↑
                </button>
                <div className="flex gap-1">
                  <button
                    className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                    onClick={e => { e.stopPropagation(); onAdjustPosition(slot, -1, 0) }}
                  >
                    ←
                  </button>
                  <button
                    className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                    onClick={e => { e.stopPropagation(); onAdjustPosition(slot, 1, 0) }}
                  >
                    →
                  </button>
                </div>
                <button
                  className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                  onClick={e => { e.stopPropagation(); onAdjustPosition(slot, 0, 1) }}
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        )
      })}
        </>
      )}

      {/* ── CLOSET section ──────────────────────────────────────────────────── */}
      {/* CLOSET section header */}
      <div
        onClick={() => setClosetOpen(o => !o)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}
        className="text-white/70 font-bold text-[10px] uppercase tracking-widest border-t border-white/10 pt-2"
      >
        <span>{closetOpen ? '▼' : '▶'}</span>
        <span>CLOSET</span>
      </div>

      {closetOpen && (
        <>
      {/* Column headers */}
      <div className="grid gap-x-2 text-white/40 mb-1 mt-1" style={{ gridTemplateColumns: '72px 36px 36px 44px 60px' }}>
        <span>ID</span>
        <span className="text-right">X</span>
        <span className="text-right">Y</span>
        <span className="text-right">SCALE</span>
        <span />
      </div>

      {ITEMS.map(item => {
        const cadj = closetAdjustments[item.id] ?? { x: 0, y: 0, scale: 1 }
        return (
          <div key={item.id} className="rounded px-1 py-0.5 mb-1">
            <div className="grid gap-x-2 items-center" style={{ gridTemplateColumns: '72px 36px 36px 44px 60px' }}>
              <span className="text-white/80 truncate">{item.id}</span>
              <span className="text-right text-cyan-300">{Math.round(cadj.x)}</span>
              <span className="text-right text-cyan-300">{Math.round(cadj.y)}</span>
              <span className="text-right text-green-300">{cadj.scale.toFixed(2)}</span>
              <div className="flex gap-1 justify-end">
                <button
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                  onClick={() => onAdjustClosetItem(item.id, { scale: parseFloat(Math.max(0.1, cadj.scale + 0.05).toFixed(2)) })}
                >
                  +
                </button>
                <button
                  className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] leading-none"
                  onClick={() => onAdjustClosetItem(item.id, { scale: parseFloat(Math.max(0.1, cadj.scale - 0.05).toFixed(2)) })}
                >
                  −
                </button>
              </div>
            </div>
            {/* Arrow nudge */}
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <button
                className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                onClick={() => onAdjustClosetItem(item.id, { y: cadj.y - 1 })}
              >
                ↑
              </button>
              <div className="flex gap-1">
                <button
                  className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                  onClick={() => onAdjustClosetItem(item.id, { x: cadj.x - 1 })}
                >
                  ←
                </button>
                <button
                  className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                  onClick={() => onAdjustClosetItem(item.id, { x: cadj.x + 1 })}
                >
                  →
                </button>
              </div>
              <button
                className="w-6 h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
                onClick={() => onAdjustClosetItem(item.id, { y: cadj.y + 1 })}
              >
                ↓
              </button>
            </div>
          </div>
        )
      })}
        </>
      )}
    </div>
  )
}

// ── Game scale hook ────────────────────────────────────────────────────────────

const GAME_W = 1440
const GAME_H = 810

function useGameScale() {
  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H)
  )
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

// ── App ────────────────────────────────────────────────────────────────────────


const EMPTY_EQUIPPED: Record<SlotId, string | null> = {
  feet:  null,
  legs:  null,
  torso: null,
  body:  null,
  neck:  null,
  head:  null,
}

export default function App() {
  const scale    = useGameScale()
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const canvasRef = useRef<HTMLDivElement>(null)

  const [equipped, setEquipped]       = useState<Record<SlotId, string | null>>(EMPTY_EQUIPPED)
  const [drag, setDrag]               = useState<DragState | null>(null)
  const [lastWord, setLastWord]       = useState<VocabWord | null>(null)
  const [hoveredId, setHoveredId]     = useState<string | undefined>(undefined)

  // ── Debug state ─────────────────────────────────────────────────────────────
  const [debugMode, setDebugMode]       = useState(false)
  const [adjustments, setAdjustments]   = useState<Record<AdjustmentKey, LayerAdjustment>>(DEFAULT_ADJUSTMENTS)
  const [selectedSlot, setSelectedSlot] = useState<AdjustmentKey | null>(null)
  const debugDragRef                    = useRef<DebugDragState | null>(null)

  const closetAdjDragRef = useRef<ClosetAdjDragState | null>(null)

  // Closet item per-item adjustments (position + scale, debug only)
  const [closetAdjustments, setClosetAdjustments] = useState<Record<string, ClosetItemAdjustment>>({
    'shirt':        { x: -29,  y: -135, scale: 1.40 },
    'jeans':        { x: -19,  y: -126, scale: 0.80 },
    'pyjamas':      { x: 21,   y: -147, scale: 1.25 },
    'hat':          { x: -1,   y: 23,   scale: 1.00 },
    'scarf':        { x: -84,  y: 94,   scale: 1.00 },
    'trainers':     { x: 44,   y: -7,   scale: 0.65 },
    'socks':        { x: -336, y: 148,  scale: 1.65 },
    'cowboy-boots': { x: 4,    y: -4,   scale: 1.15 },
  })

  const peteRef = useRef<HTMLDivElement>(null)

  // ── Drag: global pointer events ─────────────────────────────────────────────

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      const s = scaleRef.current
      const canvas = canvasRef.current
      if (!canvas) {
        setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : null))
        return
      }
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / s
      const y = (e.clientY - rect.top)  / s
      setDrag(d => (d ? { ...d, x, y } : null))
    }

    function onUp(e: PointerEvent) {
      setDrag(current => {
        if (!current) return null

        const peteEl = peteRef.current
        if (peteEl) {
          const rect   = peteEl.getBoundingClientRect()
          // Pete rect is in screen-space; expand hit area by 20 screen px
          const onPete =
            e.clientX >= rect.left  - 20 &&
            e.clientX <= rect.right + 20 &&
            e.clientY >= rect.top   - 20 &&
            e.clientY <= rect.bottom + 20

          if (onPete && !current.wasEquipped) {
            // New item dropped onto Pete → equip
            setEquipped(eq => ({ ...eq, [current.item.slot]: current.item.id }))
            setLastWord({ word: current.item.word, label: current.item.label })
            if (current.item.defaultAdjustment) {
              setAdjustments(prev => ({
                ...prev,
                [current.item.slot]: { ...DEFAULT_ADJUSTMENT, ...current.item.defaultAdjustment },
              }))
            }
          } else if (!onPete && current.wasEquipped) {
            // Equipped item dragged away from Pete → unequip
            setEquipped(eq => ({ ...eq, [current.item.slot]: null }))
          }
          // onPete && wasEquipped → dropped back on Pete, keep equipped (no-op)
        }

        return null
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag])

  // ── Debug: layer drag (global pointer events) ────────────────────────────────

  useEffect(() => {
    if (!debugMode) return

    function onMove(e: PointerEvent) {
      const state = debugDragRef.current
      if (!state) return
      const s  = scaleRef.current
      const dx = (e.clientX - state.startPointerX) / s
      const dy = (e.clientY - state.startPointerY) / s
      setAdjustments(prev => ({
        ...prev,
        [state.slotId]: {
          ...prev[state.slotId],
          x: state.startAdjX + dx,
          y: state.startAdjY + dy,
        },
      }))
    }

    function onUp() {
      if (debugDragRef.current) {
        debugDragRef.current = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [debugMode])

  // ── Debug: closet item adjustment drag (global pointer events) ─────────────

  useEffect(() => {
    if (!debugMode) return

    function onMove(e: PointerEvent) {
      const state = closetAdjDragRef.current
      if (!state) return
      const s  = scaleRef.current
      const dx = (e.clientX - state.startPointerX) / s
      const dy = (e.clientY - state.startPointerY) / s
      setClosetAdjustments(prev => ({
        ...prev,
        [state.id]: {
          ...(prev[state.id] ?? { x: 0, y: 0, scale: 1 }),
          x: state.startAdjX + dx,
          y: state.startAdjY + dy,
        },
      }))
    }

    function onUp() {
      closetAdjDragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [debugMode])

  // ── Vocabulary badge: auto-hide after 3 s ──────────────────────────────────

  useEffect(() => {
    if (!lastWord) return
    const t = setTimeout(() => setLastWord(null), 3000)
    return () => clearTimeout(t)
  }, [lastWord])

  // ── Derived state ───────────────────────────────────────────────────────────

  const equippedIds = new Set(Object.values(equipped).filter((v): v is string => v !== null))
  const draggingId  = drag?.item.id

  function clientToCanvas(clientX: number, clientY: number) {
    const canvas = canvasRef.current
    if (!canvas) return { x: clientX, y: clientY }
    const rect = canvas.getBoundingClientRect()
    const s    = scaleRef.current
    return {
      x: (clientX - rect.left) / s,
      y: (clientY - rect.top)  / s,
    }
  }

  function startDrag(item: ClothingItem, e: React.PointerEvent) {
    if (debugMode) return   // disable normal drag when debug is on
    e.preventDefault()
    setHoveredId(undefined)
    const isEquipped = equippedIds.has(item.id)
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    setDrag({ item, x, y, wasEquipped: isEquipped })
  }

  function startEquippedDrag(item: ClothingItem, e: React.PointerEvent) {
    // Called when the user grabs a layer directly from Pete's body
    if (debugMode) return
    e.preventDefault()
    e.stopPropagation()
    setHoveredId(undefined)
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    setDrag({ item, x, y, wasEquipped: true })
  }

  function handleClosetAdjPointerDown(id: string, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const current = closetAdjustments[id] ?? { x: 0, y: 0, scale: 1 }
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    closetAdjDragRef.current = {
      id,
      startPointerX: x,
      startPointerY: y,
      startAdjX: current.x,
      startAdjY: current.y,
    }
  }

  // ── Debug helpers ────────────────────────────────────────────────────────────

  function toggleDebug() {
    setDebugMode(prev => {
      if (prev) {
        setSelectedSlot(null)
      }
      return !prev
    })
  }

  function handleSelectSlot(slot: AdjustmentKey) {
    setSelectedSlot(slot)
  }

  function handleDebugPointerDown(slot: AdjustmentKey, e: React.PointerEvent) {
    // Only start layer drag when the layer is already selected
    if (selectedSlot !== slot) return
    e.stopPropagation()
    e.preventDefault()
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    debugDragRef.current = {
      slotId: slot,
      startPointerX: x,
      startPointerY: y,
      startAdjX: adjustments[slot].x,
      startAdjY: adjustments[slot].y,
    }
  }

  function handleAdjustScale(slot: AdjustmentKey, delta: number) {
    setAdjustments(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        scale: Math.max(0.1, parseFloat((prev[slot].scale + delta).toFixed(2))),
      },
    }))
  }

  function handleAdjustRotate(slot: AdjustmentKey, delta: number) {
    setAdjustments(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        rotate: prev[slot].rotate + delta,
      },
    }))
  }

  function handleAdjustPosition(slot: AdjustmentKey, dx: number, dy: number) {
    setAdjustments(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        x: prev[slot].x + dx,
        y: prev[slot].y + dy,
      },
    }))
  }

  function handleAdjustClosetItem(id: string, patch: Partial<ClosetItemAdjustment>) {
    setClosetAdjustments(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { x: 0, y: 0, scale: 1 }), ...patch },
    }))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="game-viewport">
    <div
      ref={canvasRef}
      className="game-canvas"
      style={{ transform: `scale(${scale})`, cursor: drag ? 'grabbing' : 'default' }}
    >
      {/* Background */}
      <img
        src={roomBg}
        alt="Pete's room"
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
      />

      {/* Closet: 3 zones — rod, middle shelf, bottom boxes */}
      <Closet
        equippedIds={equippedIds}
        draggingId={draggingId}
        hoveredId={hoveredId}
        debugMode={debugMode}
        closetAdjustments={closetAdjustments}
        onPointerDown={startDrag}
        onPointerEnter={id => { if (!drag) setHoveredId(id) }}
        onPointerLeave={() => setHoveredId(undefined)}
        onClosetAdjPointerDown={handleClosetAdjPointerDown}
      />

      {/* Pete character with stacked layers */}
      <Pete
        peteRef={peteRef}
        equipped={equipped}
        debugMode={debugMode}
        adjustments={adjustments}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlot}
        onDebugPointerDown={handleDebugPointerDown}
        onEquippedPointerDown={startEquippedDrag}
      />

      {/* Ghost drag item */}
      {drag && <GhostDrag drag={drag} />}

      {/* Vocabulary badge */}
      {lastWord && <VocabBadge word={lastWord} />}

      {/* Debug panel */}
      {debugMode && (
        <DebugPanel
          equipped={equipped}
          adjustments={adjustments}
          selectedSlot={selectedSlot}
          closetAdjustments={closetAdjustments}
          onAdjustScale={handleAdjustScale}
          onAdjustRotate={handleAdjustRotate}
          onAdjustPosition={handleAdjustPosition}
          onSelectSlot={handleSelectSlot}
          onAdjustClosetItem={handleAdjustClosetItem}
        />
      )}

      {/* Debug toggle button — gear icon, no text */}
      <button
        onClick={toggleDebug}
        className="absolute bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full shadow-lg"
        style={{
          background: 'rgba(0,0,0,0.6)',
          outline: debugMode ? '2px solid #facc15' : 'none',
        }}
        title="Toggle debug"
      >
        <span
          className="text-lg leading-none select-none"
          style={{
            display: 'inline-block',
            transition: 'transform 0.4s',
            transform: debugMode ? 'rotate(60deg)' : 'rotate(0deg)',
          }}
        >
          ⚙
        </span>
      </button>
    </div>
    </div>
  )
}
