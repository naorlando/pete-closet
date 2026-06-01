import { useState, useEffect, useRef } from 'react'

import roomBg from './assets/room-background.webp'

// New background + windows
import windowSummer from './assets/window-summer.webp'
import windowAutumn from './assets/window-autumn.webp'
import windowNight from './assets/window-night.webp'

// New clothing layers
import layerShorts from './assets/layers/layer-shorts.webp'
import layerCap from './assets/layers/layer-cap.webp'
import layerCoatWinter from './assets/layers/layer-coat-winter.webp'

// New closet thumbnails
import closetShorts from './assets/thumbnails/closet-shorts.webp'
import closetCap from './assets/thumbnails/closet-cap.webp'
import closetCoatWinter from './assets/thumbnails/closet-coat-winter.webp'

// Base Pete — always visible, never changes
import peteBase from './assets/pete/pete-base.webp'
import peteNoArms from './assets/pete/pete-no-arms.webp'
import peteNoFeet from './assets/pete/pete-no-feet.webp'
import peteNoArmsNoFeet from './assets/pete/pete-no-arms-no-feet.webp'

// Layers (transparent PNGs, same 1086×1448 canvas as base)
import layerJeans from './assets/layers/layer-jeans.webp'
import layerShirt from './assets/layers/layer-shirt.webp'
import layerPyjamas from './assets/layers/layer-pyjamas.webp'
import layerTrainers from './assets/layers/layer-trainers.webp'
import layerSocks from './assets/layers/layer-socks.webp'
import layerSocksLeft from './assets/layers/layer-socks-left.webp'
import layerSocksRight from './assets/layers/layer-socks-right.webp'
import layerCowboyBoots from './assets/layers/layer-cowboy-boots.webp'
import layerHat from './assets/layers/layer-hat.webp'
import layerScarf from './assets/layers/layer-scarf.webp'

// Thumbnail for socks closet display
import thumbSocksCloset from './assets/thumbnails/thumb-socks-closet.webp'

// Tight-cropped closet thumbnails
import closetShirt   from './assets/thumbnails/closet-shirt.webp'
import closetJeans   from './assets/thumbnails/closet-jeans.webp'
import closetPyjamas from './assets/thumbnails/closet-pyjamas.webp'
import closetTrainers from './assets/thumbnails/closet-trainers.webp'
import closetSocks   from './assets/thumbnails/closet-socks.webp'
import closetBoots   from './assets/thumbnails/closet-cowboy-boots.webp'
import closetHat     from './assets/thumbnails/closet-hat.webp'
import closetScarf   from './assets/thumbnails/closet-scarf.webp'

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

type DebugTarget = 'pete' | 'layers' | 'closet'

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
    defaultAdjustment: { x: 13, y: 6,  scale: 1.10, rotate: 0 },
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
    defaultAdjustment: { x: 4, y: 55, scale: 0.85, rotate: 0 },
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
    defaultAdjustment: { x: 12, y: 11, scale: 1.00, rotate: 0 },
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
    defaultAdjustment: { x: 40, y: -42, scale: 1.15, rotate: 0 },
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
    defaultAdjustment: { x: -16, y: 22, scale: 1.15, rotate: 0 },
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
    defaultAdjustment: { x: 2, y: 5, scale: 1.10, rotate: 0 },
  },
  // Shorts — legs slot
  {
    id: 'shorts',
    word: 'SHORTS',
    label: 'swim shorts',
    slot: SLOT.LEGS,
    layer: layerShorts,
    thumbnail: layerShorts,
    closetThumbnail: closetShorts,
    closetHeight: 'calc(551px * 0.22)',
    defaultAdjustment: { x: 9, y: 96, scale: 0.85, rotate: 0 },
  },
  // Baseball cap — head slot
  {
    id: 'cap',
    word: 'CAP',
    label: 'a baseball cap',
    slot: SLOT.HEAD,
    layer: layerCap,
    thumbnail: layerCap,
    closetThumbnail: closetCap,
    closetHeight: 'calc(551px * 0.15)',
    defaultAdjustment: { x: 30, y: -26, scale: 1.15, rotate: 0 },
  },
  // Winter coat — torso slot
  {
    id: 'coat-winter',
    word: 'COAT',
    label: 'a winter coat',
    slot: SLOT.TORSO,
    layer: layerCoatWinter,
    thumbnail: layerCoatWinter,
    closetThumbnail: closetCoatWinter,
    closetHeight: 'calc(551px * 0.30)',
    defaultAdjustment: { x: 13, y: 32, scale: 1.10, rotate: 0 },
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
  legs:         { x: 4,  y: 55,  scale: 0.85, rotate: 0 },
  torso:        { x: 13, y: 6,   scale: 1.10, rotate: 0 },
  body:         { x: 12, y: 11,  scale: 1.00, rotate: 0 },
  neck:         { x: -16, y: 22, scale: 1.15, rotate: 0 },
  head:         { x: 40, y: -42, scale: 1.15, rotate: 0 },
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
  debugTarget: DebugTarget
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
  debugTarget,
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
          if (debugMode && debugTarget === 'closet') {
            onClosetAdjPointerDown(item.id, e)
            return
          }
          if (debugMode) return  // debug mode handles its own drag
          onPointerDown(item, e)
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
          if (debugMode && debugTarget === 'closet') {
            onClosetAdjPointerDown(item.id, e)
            return
          }
          if (debugMode) return  // debug mode handles its own drag
          onPointerDown(item, e)
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
          if (debugMode && debugTarget === 'closet') {
            onClosetAdjPointerDown(item.id, e)
            return
          }
          if (debugMode) return  // debug mode handles its own drag
          onPointerDown(item, e)
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

// ── Slot hit zones for unequipping (fractions of Pete's 551px height) ─────────

const SLOT_HIT_ZONES: Record<string, { top: number; height: number }> = {
  head:  { top: 0,    height: 0.28 },  // hat covers top 28%
  neck:  { top: 0.22, height: 0.20 },  // scarf covers 22–42%
  torso: { top: 0.30, height: 0.40 },  // shirt covers 30–70%
  body:  { top: 0.28, height: 0.65 },  // pyjamas covers 28–93%
  legs:  { top: 0.55, height: 0.40 },  // jeans covers 55–95%
  feet:  { top: 0.80, height: 0.20 },  // shoes cover 80–100%
}

// ── Pete character: stacked transparent layers ─────────────────────────────────

interface PeteProps {
  peteRef: React.RefObject<HTMLDivElement | null>
  equipped: Record<SlotId, string | null>
  debugMode: boolean
  peteOffset: { x: number; y: number }
  peteDebugActive: boolean
  adjustments: Record<AdjustmentKey, LayerAdjustment>
  selectedSlot: AdjustmentKey | null
  onSelectSlot: (slot: AdjustmentKey) => void
  onDebugPointerDown: (slot: AdjustmentKey, e: React.PointerEvent) => void
  onEquippedPointerDown: (item: ClothingItem, e: React.PointerEvent) => void
  onPetePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPetePointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPetePointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
}

function Pete({
  peteRef,
  equipped,
  debugMode,
  peteOffset,
  peteDebugActive,
  adjustments,
  selectedSlot,
  onSelectSlot,
  onDebugPointerDown,
  onEquippedPointerDown,
  onPetePointerDown,
  onPetePointerMove,
  onPetePointerUp,
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


  function buildLayerStyle(zIndex: number, key: AdjustmentKey): React.CSSProperties {
    const adj = adjustments[key]
    const isSelected = selectedSlot === key
    return {
      zIndex,
      transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`,
      // Debug mode: keep pointer events so layer drag (select → drag) works on the img.
      // Normal mode: none — hit-zone divs handle unequip dragging with tight bounds.
      pointerEvents: debugMode ? 'auto' : 'none',
      cursor: debugMode ? (isSelected ? 'move' : 'pointer') : 'default',
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
      style={{
        left: '38%',
        bottom: '14%',
        transform: `translateX(calc(-50% + ${peteOffset.x}px)) translateY(${peteOffset.y}px)`,
        cursor: peteDebugActive ? 'move' : undefined,
      }}
      onPointerDown={peteDebugActive ? onPetePointerDown : undefined}
      onPointerMove={peteDebugActive ? onPetePointerMove : undefined}
      onPointerUp={peteDebugActive ? onPetePointerUp : undefined}
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

        {/* Hit zones for unequipping — tight divs per slot, only in normal mode */}
        {!debugMode && (Object.entries(equipped) as [SlotId, string | null][]).map(([slotId, itemId]) => {
          if (!itemId) return null;
          const zone = SLOT_HIT_ZONES[slotId];
          if (!zone) return null;
          const item = ITEMS.find(i => i.id === itemId);
          if (!item) return null;
          return (
            <div
              key={slotId}
              style={{
                position: 'absolute',
                left: '10%',
                width: '80%',
                top: `${zone.top * 100}%`,
                height: `${zone.height * 100}%`,
                cursor: 'grab',
                zIndex: 10,
                // Uncomment to debug: background: 'rgba(255,0,0,0.2)',
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEquippedPointerDown(item, e);
              }}
            />
          );
        })}
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
  peteOffset: { x: number; y: number }
  debugTarget: DebugTarget
  onDebugTargetChange: (target: DebugTarget) => void
  onAdjustScale: (slot: AdjustmentKey, delta: number) => void
  onAdjustRotate: (slot: AdjustmentKey, delta: number) => void
  onAdjustPosition: (slot: AdjustmentKey, dx: number, dy: number) => void
  onSelectSlot: (slot: AdjustmentKey) => void
  onAdjustClosetItem: (id: string, patch: Partial<ClosetItemAdjustment>) => void
  onNudgePete: (dx: number, dy: number) => void
  onResetPete: () => void
}

const SLOT_ORDER: SlotId[] = [SLOT.BODY, SLOT.TORSO, SLOT.LEGS, SLOT.FEET, SLOT.NECK, SLOT.HEAD]

const DEBUG_TAB_STYLE_BASE: React.CSSProperties = {
  flex: 1, padding: '3px 0', fontSize: 10,
  borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
}

function DebugPanel({
  equipped,
  adjustments,
  selectedSlot,
  closetAdjustments,
  peteOffset,
  debugTarget,
  onDebugTargetChange,
  onAdjustScale,
  onAdjustRotate,
  onAdjustPosition,
  onSelectSlot,
  onAdjustClosetItem,
  onNudgePete,
  onResetPete,
}: DebugPanelProps) {
  const equippedFeetItem = equipped.feet ? ITEMS.find(i => i.id === equipped.feet) : null
  const feetIsSplit = equippedFeetItem?.isSplit ?? false

  // Build the list of adjustment keys to show in the layers panel
  const equippedKeys: AdjustmentKey[] = SLOT_ORDER.flatMap(slot => {
    if (equipped[slot] === null) return []
    if (slot === SLOT.FEET && feetIsSplit) return ['feet-left', 'feet-right']
    return [slot]
  })

  return (
    <div
      className="absolute left-4 z-50 rounded-lg p-2 font-mono text-xs"
      style={{ background: 'rgba(0,0,0,0.82)', minWidth: 240, bottom: 60, maxHeight: '70%', overflowY: 'auto' }}
    >
      <p className="text-yellow-400 font-bold mb-2 text-[10px] uppercase tracking-widest">
        Layer Debugger
      </p>

      {/* Export button */}
      <button
        onClick={() => {
          const data = {
            layers: adjustments,
            closet: closetAdjustments,
            pete: peteOffset,
          }
          navigator.clipboard.writeText(JSON.stringify(data, null, 2))
            .then(() => alert('Copied to clipboard!'))
        }}
        style={{
          width: '100%', marginBottom: 8, padding: '4px 8px',
          background: 'rgba(250,204,21,0.2)', border: '1px solid rgba(250,204,21,0.4)',
          borderRadius: 4, color: '#facc15', fontSize: 10, cursor: 'pointer',
        }}
      >
        📋 Export values
      </button>

      {/* Mode selector tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['pete', 'layers', 'closet'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onDebugTargetChange(mode)}
            style={{
              ...DEBUG_TAB_STYLE_BASE,
              background: debugTarget === mode ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.05)',
              border: debugTarget === mode ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.15)',
              color: debugTarget === mode ? '#facc15' : '#aaa',
            }}
          >
            {mode === 'pete' ? '🐱 Pete' : mode === 'layers' ? '👕 Layers' : '🚪 Closet'}
          </button>
        ))}
      </div>

      {/* ── PETE section ─────────────────────────────────────────────────────── */}
      {debugTarget === 'pete' && (
        <div>
          <div style={{ color: '#ccc', fontSize: 10, marginBottom: 4 }}>
            Pete position: x={peteOffset.x} y={peteOffset.y}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, width: 90 }}>
            <div />
            <button
              className="h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
              onClick={() => onNudgePete(0, -1)}
            >
              ↑
            </button>
            <div />
            <button
              className="h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
              onClick={() => onNudgePete(-1, 0)}
            >
              ←
            </button>
            <button
              className="h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
              onClick={() => onResetPete()}
            >
              ⊙
            </button>
            <button
              className="h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
              onClick={() => onNudgePete(1, 0)}
            >
              →
            </button>
            <div />
            <button
              className="h-5 bg-white/10 hover:bg-white/20 rounded text-white text-[10px]"
              onClick={() => onNudgePete(0, 1)}
            >
              ↓
            </button>
            <div />
          </div>
          <button
            style={{
              marginTop: 4, fontSize: 9, padding: '2px 6px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 3, color: '#aaa', cursor: 'pointer',
            }}
            onClick={() => onResetPete()}
          >
            Reset
          </button>
        </div>
      )}

      {/* ── LAYERS section ───────────────────────────────────────────────────── */}
      {debugTarget === 'layers' && (
        <>
          {equippedKeys.length === 0 ? (
            <div className="text-white/40 text-[10px]">No layers equipped</div>
          ) : (
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
                      <span className={isSelected ? 'text-red-400 font-bold' : 'text-white/80'}>
                        {slot}
                      </span>
                      <span className="text-right text-cyan-300">{Math.round(adj.x)}</span>
                      <span className="text-right text-cyan-300">{Math.round(adj.y)}</span>
                      <span className="text-right text-green-300">{adj.scale.toFixed(2)}</span>
                      <span className="text-right text-orange-300">{adj.rotate}°</span>
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

                    {/* Rotate buttons */}
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
        </>
      )}

      {/* ── CLOSET section ───────────────────────────────────────────────────── */}
      {debugTarget === 'closet' && (
        <>
          {/* Column headers */}
          <div className="grid gap-x-2 text-white/40 mb-1" style={{ gridTemplateColumns: '72px 36px 36px 44px 60px' }}>
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

// ── Season ─────────────────────────────────────────────────────────────────────

type Season = 'summer' | 'autumn' | 'night'

// ── Season Wheel ───────────────────────────────────────────────────────────────

function SunIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill="#FFD700" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <line
          key={deg}
          x1={12 + 8 * Math.cos((deg * Math.PI) / 180)}
          y1={12 + 8 * Math.sin((deg * Math.PI) / 180)}
          x2={12 + 11 * Math.cos((deg * Math.PI) / 180)}
          y2={12 + 11 * Math.sin((deg * Math.PI) / 180)}
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function LeafIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {/* Maple leaf shape */}
      <path d="M12 2 L13.5 6 L17 5 L15 8.5 L19 9 L16 11 L18 14.5 L14.5 13 L14 17 L12 15 L10 17 L9.5 13 L6 14.5 L8 11 L5 9 L9 8.5 L7 5 L10.5 6 Z"
        fill="#D2580A" />
      {/* Stem */}
      <line x1="12" y1="17" x2="12" y2="22" stroke="#8B4513" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Vein highlights */}
      <line x1="12" y1="15" x2="8" y2="11" stroke="#E87020" strokeWidth="0.8" opacity="0.6"/>
      <line x1="12" y1="15" x2="16" y2="11" stroke="#E87020" strokeWidth="0.8" opacity="0.6"/>
      <line x1="12" y1="10" x2="12" y2="3" stroke="#E87020" strokeWidth="0.8" opacity="0.6"/>
    </svg>
  )
}

function MoonIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#C8D8FF" />
      <circle cx="16" cy="8" r="1" fill="white" opacity={0.6} />
      <circle cx="14" cy="14" r="0.7" fill="white" opacity={0.5} />
    </svg>
  )
}

const SEASON_COLORS: Record<Season, string> = {
  summer: '#FFD700',
  autumn: '#D2580A',
  night:  '#8BB8FF',
}

const DONUT_R = 38   // ring radius
const BTN_R = 14     // icon button radius

// Positions: summer at top (-90°), autumn at bottom-left (150°), night at bottom-right (30°)
const SEASON_POSITIONS: Record<Season, { angle: number }> = {
  summer: { angle: -90 },
  autumn: { angle: 150 },
  night:  { angle: 30 },
}

function SeasonWheel({ season, onSelect }: { season: Season; onSelect: (s: Season) => void }) {
  const size = (DONUT_R + BTN_R + 6) * 2
  const cx = size / 2
  const cy = size / 2

  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 20 }}>
      <svg width={size} height={size}>
        {/* Donut ring */}
        <circle cx={cx} cy={cy} r={DONUT_R} fill="none"
          stroke="rgba(255,255,255,0.15)" strokeWidth="3" />

        {/* Season buttons on the ring */}
        {(Object.entries(SEASON_POSITIONS) as [Season, { angle: number }][]).map(([s, { angle }]) => {
          const rad = (angle * Math.PI) / 180
          const bx = cx + DONUT_R * Math.cos(rad)
          const by = cy + DONUT_R * Math.sin(rad)
          const active = season === s
          const color = SEASON_COLORS[s]
          return (
            <g key={s} onClick={() => onSelect(s)} style={{ cursor: 'pointer' }}>
              <circle cx={bx} cy={by} r={BTN_R}
                fill={active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.55)'}
                stroke={active ? color : 'rgba(255,255,255,0.2)'}
                strokeWidth={active ? 2.5 : 1}
              />
              <foreignObject x={bx - 11} y={by - 11} width={22} height={22}
                style={{ pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, opacity: active ? 1 : 0.6 }}>
                  {s === 'summer' ? <SunIcon /> : s === 'autumn' ? <LeafIcon /> : <MoonIcon />}
                </div>
              </foreignObject>
            </g>
          )
        })}

        {/* Active season indicator in center */}
        <circle cx={cx} cy={cy} r={10}
          fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <foreignObject x={cx - 9} y={cy - 9} width={18} height={18} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
            {season === 'summer' ? <SunIcon size={14} /> : season === 'autumn' ? <LeafIcon size={14} /> : <MoonIcon size={14} />}
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}

const WINDOW_SRC: Record<Season, string> = {
  summer: windowSummer,
  autumn: windowAutumn,
  night:  windowNight,
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
  const [season, setSeason]           = useState<Season>('summer')

  // ── Debug state ─────────────────────────────────────────────────────────────
  const [debugMode, setDebugMode]       = useState(false)
  const [debugTarget, setDebugTarget]   = useState<DebugTarget>('layers')
  const [peteOffset, setPeteOffset]     = useState<{ x: number; y: number }>({ x: 33, y: 25 })
  const [adjustments, setAdjustments]   = useState<Record<AdjustmentKey, LayerAdjustment>>(DEFAULT_ADJUSTMENTS)
  const [selectedSlot, setSelectedSlot] = useState<AdjustmentKey | null>(null)
  const debugDragRef                    = useRef<DebugDragState | null>(null)

  const closetAdjDragRef = useRef<ClosetAdjDragState | null>(null)
  const peteDragRef = useRef<{ startX: number; startY: number; startPeteX: number; startPeteY: number } | null>(null)

  // Closet item per-item adjustments (position + scale, debug only)
  const [closetAdjustments, setClosetAdjustments] = useState<Record<string, ClosetItemAdjustment>>({
    'shirt':        { x: -34,  y: -97,  scale: 1.40 },
    'jeans':        { x: -31,  y: -90,  scale: 0.85 },
    'pyjamas':      { x: 69,   y: -106, scale: 1.25 },
    'hat':          { x: -1,   y: 23,   scale: 1.00 },
    'scarf':        { x: -33,  y: 72,   scale: 1.00 },
    'trainers':     { x: 17,   y: 12,   scale: 0.65 },
    'socks':        { x: -336, y: 148,  scale: 1.65 },
    'cowboy-boots': { x: -34,  y: 14,   scale: 1.15 },
    'shorts':       { x: -89,  y: -79,  scale: 0.65 },
    'cap':          { x: 51,   y: 67,   scale: 1.00 },
    'coat-winter':  { x: 17,   y: -96,  scale: 1.00 },
  })

  const peteRef = useRef<HTMLDivElement>(null)

  // ── Preload Pete variant images on mount ────────────────────────────────────

  useEffect(() => {
    const srcs = [peteBase, peteNoArms, peteNoFeet, peteNoArmsNoFeet, roomBg,
      layerShirt, layerJeans, layerPyjamas, layerHat, layerScarf,
      layerTrainers, layerCowboyBoots, layerSocks, layerSocksLeft, layerSocksRight,
      windowSummer, windowAutumn, windowNight,
      layerShorts, layerCap, layerCoatWinter]
    srcs.forEach(src => { const img = new window.Image(); img.src = src })
  }, []);

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

    window.addEventListener('pointermove', onMove, { passive: true })
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

    window.addEventListener('pointermove', onMove, { passive: true })
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
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return
      const s = scaleRef.current
      const currentCanvasX = (e.clientX - canvasRect.left) / s
      const currentCanvasY = (e.clientY - canvasRect.top)  / s
      const dx = currentCanvasX - state.startPointerX
      const dy = currentCanvasY - state.startPointerY
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

    window.addEventListener('pointermove', onMove, { passive: true })
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

  function handleNudgePete(dx: number, dy: number) {
    setPeteOffset(p => ({ x: p.x + dx, y: p.y + dy }))
  }

  function handleResetPete() {
    setPeteOffset({ x: 0, y: 0 })
  }

  // ── Debug: Pete container drag handlers ─────────────────────────────────────

  function handlePetePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    const s = scaleRef.current
    peteDragRef.current = {
      startX: (e.clientX - canvasRect.left) / s,
      startY: (e.clientY - canvasRect.top) / s,
      startPeteX: peteOffset.x,
      startPeteY: peteOffset.y,
    }
  }

  function handlePetePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!peteDragRef.current) return
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    const s = scaleRef.current
    const cx = (e.clientX - canvasRect.left) / s
    const cy = (e.clientY - canvasRect.top) / s
    setPeteOffset({
      x: peteDragRef.current.startPeteX + (cx - peteDragRef.current.startX),
      y: peteDragRef.current.startPeteY + (cy - peteDragRef.current.startY),
    })
  }

  function handlePetePointerUp() {
    peteDragRef.current = null
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
      {/* Room base */}
      <img
        src={roomBg}
        alt="Pete's room"
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
      />
      {/* Seasonal window overlay — same canvas size, same object-fit */}
      <img
        src={WINDOW_SRC[season]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />

      {/* Season wheel — bottom-left radial picker */}
      <SeasonWheel season={season} onSelect={setSeason} />

      {/* Closet: 3 zones — rod, middle shelf, bottom boxes */}
      <Closet
        equippedIds={equippedIds}
        draggingId={draggingId}
        hoveredId={hoveredId}
        debugMode={debugMode}
        debugTarget={debugTarget}
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
        peteOffset={peteOffset}
        peteDebugActive={debugMode && debugTarget === 'pete'}
        adjustments={adjustments}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlot}
        onDebugPointerDown={handleDebugPointerDown}
        onEquippedPointerDown={startEquippedDrag}
        onPetePointerDown={handlePetePointerDown}
        onPetePointerMove={handlePetePointerMove}
        onPetePointerUp={handlePetePointerUp}
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
          peteOffset={peteOffset}
          debugTarget={debugTarget}
          onDebugTargetChange={setDebugTarget}
          onAdjustScale={handleAdjustScale}
          onAdjustRotate={handleAdjustRotate}
          onAdjustPosition={handleAdjustPosition}
          onSelectSlot={handleSelectSlot}
          onAdjustClosetItem={handleAdjustClosetItem}
          onNudgePete={handleNudgePete}
          onResetPete={handleResetPete}
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
