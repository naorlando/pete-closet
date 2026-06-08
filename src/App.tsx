import { useState, useEffect, useRef, Fragment } from 'react'

import roomBg from './assets/room-background.webp'

import paletteIcon from './assets/icons/icon-palette.webp'
import { colorizeImage } from './hooks/useColorizedImage'

// New background + windows
import windowSummer from './assets/window-summer.webp'
import windowAutumn from './assets/window-autumn.webp'
import windowNight from './assets/window-night.webp'
import windowRain from './assets/window-rain.webp'

// Season wheel icons
import leafAutumnIcon from './assets/icons/icon-leaf-autumn.webp'

// New clothing layers
import layerShorts from './assets/layers/layer-shorts.webp'
import layerCap from './assets/layers/layer-cap.webp'
import layerCoatWinter from './assets/layers/layer-coat-winter.webp'
import layerBoxers from './assets/layers/layer-boxers.webp'
import layerGloves from './assets/layers/layer-gloves.webp'
import layerGlovesLeft from './assets/layers/layer-gloves-left.webp'
import layerGlovesRight from './assets/layers/layer-gloves-right.webp'
import layerWoolHat from './assets/layers/layer-wool-hat.webp'
import layerHelmet from './assets/layers/layer-helmet.webp'

// New closet thumbnails
import closetShorts from './assets/thumbnails/closet-shorts.webp'
import closetCap from './assets/thumbnails/closet-cap.webp'
import closetCoatWinter from './assets/thumbnails/closet-coat-winter.webp'
import closetBoxers from './assets/thumbnails/closet-boxers.webp'
import closetGloves from './assets/thumbnails/closet-gloves.webp'
import closetWoolHat from './assets/thumbnails/closet-wool-hat.webp'
import closetHelmet from './assets/thumbnails/closet-helmet.webp'

import layerUmbrella  from './assets/layers/layer-umbrella.webp'
import closetUmbrella from './assets/thumbnails/closet-umbrella.webp'

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
  colorizable?: boolean // supports HSL hue replacement
  baseHue?: number      // dominant color hue (0–360) used for replacement targeting
  isUnderlayer?: boolean   // if true, goes into equippedUnderlayers, not equipped slots
  layerZIndex?: number     // fixed z-index for underlayer rendering
  isWhiteBase?: boolean    // for white items (boxers) — special colorize handling
}

// AdjustmentKey covers regular slots + split sub-slots + underlayer slots
type AdjustmentKey = SlotId | 'feet-left' | 'feet-right' | 'underbody' | 'hands' | 'hands-left' | 'hands-right' | 'umbrella' | 'wool-hat' | 'helmet'

interface DragState {
  item: ClothingItem
  x: number
  y: number
  wasEquipped: boolean  // dragging off Pete to remove
  rotation: number      // tilt angle in degrees (velocity-based)
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
    colorizable: true, baseHue: 50,
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
    colorizable: true, baseHue: 210,
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
    colorizable: true, baseHue: 0,
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
    colorizable: true, baseHue: 0,
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
    isUnderlayer: true,
    layerZIndex: 1,
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
    colorizable: true, baseHue: 20,
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
    colorizable: true, baseHue: 190,
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
    colorizable: true, baseHue: 200,
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
    colorizable: true, baseHue: 150,
  },
  // Boxers — underlayer, white base, legs zone
  {
    id: 'boxers',
    word: 'BOXERS',
    label: 'white boxers',
    slot: SLOT.LEGS,
    layer: layerBoxers,
    thumbnail: closetBoxers,
    closetThumbnail: closetBoxers,
    closetHeight: 'calc(551px * 0.14)',
    isUnderlayer: true,
    layerZIndex: 1,
    isWhiteBase: true,
    colorizable: true,
    baseHue: 0,
    defaultAdjustment: { x: 63, y: -100, scale: 1.00, rotate: 0 },
  },
  // Gloves — underlayer, split left/right (like socks)
  {
    id: 'gloves',
    word: 'GLOVES',
    label: 'blue gloves',
    slot: SLOT.FEET,
    layer: layerGloves,
    thumbnail: closetGloves,
    closetThumbnail: closetGloves,
    closetHeight: 'calc(551px * 0.18)',
    isUnderlayer: true,
    isSplit: true,
    layerZIndex: 7,
    colorizable: true,
    baseHue: 220,
    defaultAdjustment: { x: 0, y: 0, scale: 1, rotate: 0 },
  },
  // Wool hat — head slot, NOT underlayer
  {
    id: 'wool-hat',
    word: 'WOOLHAT',
    label: 'a wool hat',
    slot: SLOT.HEAD,
    layer: layerWoolHat,
    thumbnail: closetWoolHat,
    closetThumbnail: closetWoolHat,
    closetHeight: 'calc(551px * 0.15)',
    colorizable: true,
    baseHue: 140,
    defaultAdjustment: { x: 16, y: -64, scale: 0.95, rotate: 0 },
  },
  // Construction helmet — head slot, NOT underlayer
  {
    id: 'helmet',
    word: 'HELMET',
    label: 'a hard hat',
    slot: SLOT.HEAD,
    layer: layerHelmet,
    thumbnail: closetHelmet,
    closetThumbnail: closetHelmet,
    closetHeight: 'calc(551px * 0.15)',
    colorizable: true,
    baseHue: 30,
    defaultAdjustment: { x: 16, y: -52, scale: 1.00, rotate: 0 },
  },
  // Umbrella — underlayer, top layer (z:9 above all clothing)
  {
    id: 'umbrella',
    word: 'UMBRELLA',
    label: 'an umbrella',
    slot: SLOT.HEAD,
    layer: layerUmbrella,
    thumbnail: closetUmbrella,
    closetThumbnail: closetUmbrella,
    closetHeight: 'calc(551px * 0.22)',
    isUnderlayer: true,
    layerZIndex: 9,
    colorizable: true,
    baseHue: 20,
    defaultAdjustment: { x: 46, y: 230, scale: 0.70, rotate: -11 },
  },
]

// Closet zone grouping by slot
const HANGING_ITEMS     = ITEMS.filter(i => i.slot === SLOT.TORSO || i.slot === SLOT.LEGS || i.slot === SLOT.BODY)
const MIDDLE_SHELF_ITEMS = ITEMS.filter(i => i.slot === SLOT.HEAD || i.slot === SLOT.NECK)
const BOTTOM_BOX_ITEMS  = ITEMS.filter(i => i.slot === SLOT.FEET)

const DEFAULT_ADJUSTMENT: LayerAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 }

const DEFAULT_ADJUSTMENTS: Record<AdjustmentKey, LayerAdjustment> = {
  feet:          { x: 2, y: 5, scale: 1.10, rotate: 0 },
  'feet-left':   { x: 5, y: 64, scale: 0.85, rotate: 0 },
  'feet-right':  { x: -1, y: 64, scale: 0.85, rotate: 0 },
  legs:          { x: 4,  y: 55,  scale: 0.85, rotate: 0 },
  torso:         { x: 13, y: 6,   scale: 1.10, rotate: 0 },
  body:          { x: 12, y: 11,  scale: 1.00, rotate: 0 },
  neck:          { x: -16, y: 22, scale: 1.15, rotate: 0 },
  head:          { x: 19, y: -59, scale: 1.00, rotate: 0 },
  underbody:     { x: 9, y: 19, scale: 1.05, rotate: 0 },
  hands:         { x: 0, y: 180, scale: 1.0, rotate: 0 },
  'hands-left':  { x: 4, y: 102, scale: 1.10, rotate: -7 },
  'hands-right': { x: -9, y: 100, scale: 1.10, rotate: 10 },
  umbrella:      { x: 46, y: 230, scale: 0.70, rotate: -11 },
  'wool-hat':    { x: 16, y: -64, scale: 0.95, rotate: 0 },
  'helmet':      { x: 16, y: -52, scale: 1.00, rotate: 0 },
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
  getItemImage: (item: ClothingItem, forPete: boolean) => string
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
  getItemImage,
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

  const visibleHanging = HANGING_ITEMS.filter(i => !equippedIds.has(i.id))
  const visibleMiddle  = MIDDLE_SHELF_ITEMS.filter(i => !equippedIds.has(i.id))
  const visibleBottom  = BOTTOM_BOX_ITEMS.filter(i => !equippedIds.has(i.id))

  const hangingItems = visibleHanging.map((item, i) => {
    const isDragging = draggingId === item.id
    const xPct = CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (i + 0.5)) / visibleHanging.length
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
            src={getItemImage(item, false)}
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

  const middleItems = visibleMiddle.map((item, i) => {
    const isDragging = draggingId === item.id
    const xPct = CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (i + 0.5)) / visibleMiddle.length
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
          src={getItemImage(item, false)}
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

  // Fixed positions for the 3 boxes — indexed by original BOTTOM_BOX_ITEMS order
  const BOX_POSITIONS = [0.700, 0.790, 0.885]

  const bottomItems = visibleBottom.map((item) => {
    const isDragging = draggingId === item.id
    const originalIndex = BOTTOM_BOX_ITEMS.indexOf(item)
    const xPct = BOX_POSITIONS[originalIndex] ?? CLOSET_LEFT + ((CLOSET_RIGHT - CLOSET_LEFT) * (originalIndex + 0.5)) / BOTTOM_BOX_ITEMS.length
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
          src={getItemImage(item, false)}
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
  head:      { top: 0,    height: 0.28 },  // hat covers top 28%
  neck:      { top: 0.22, height: 0.20 },  // scarf covers 22–42%
  torso:     { top: 0.30, height: 0.40 },  // shirt covers 30–70%
  body:      { top: 0.28, height: 0.65 },  // pyjamas covers 28–93%
  legs:      { top: 0.55, height: 0.40 },  // jeans covers 55–95%
  feet:      { top: 0.80, height: 0.20 },  // shoes cover 80–100%
  underbody: { top: 0.55, height: 0.25 },  // boxers — hip/waist area
  underfeet: { top: 0.82, height: 0.16 },  // socks — ankle area
  hands:     { top: 0.60, height: 0.30 },  // gloves — arm area
}

// ── Pete character: stacked transparent layers ─────────────────────────────────

interface PeteProps {
  peteRef: React.RefObject<HTMLDivElement | null>
  equipped: Record<SlotId, string | null>
  equippedUnderlayers: string[]
  debugMode: boolean
  peteOffset: { x: number; y: number }
  peteDebugActive: boolean
  adjustments: Record<AdjustmentKey, LayerAdjustment>
  selectedSlot: AdjustmentKey | null
  onSelectSlot: (slot: AdjustmentKey) => void
  onDebugPointerDown: (slot: AdjustmentKey, e: React.PointerEvent) => void
  onEquippedPointerDown: (item: ClothingItem, e: React.PointerEvent) => void
  onUnderlayerPointerDown: (item: ClothingItem, e: React.PointerEvent) => void
  onPetePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPetePointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPetePointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
  getItemImage: (item: ClothingItem, forPete: boolean) => string
}

function Pete({
  peteRef,
  equipped,
  equippedUnderlayers,
  debugMode,
  peteOffset,
  peteDebugActive,
  adjustments,
  selectedSlot,
  onSelectSlot,
  onDebugPointerDown,
  onEquippedPointerDown,
  onUnderlayerPointerDown,
  onPetePointerDown,
  onPetePointerMove,
  onPetePointerUp,
  getItemImage,
}: PeteProps) {
  // body slot active → override legs + torso (pyjamas mode)
  const equippedBody  = equipped.body  ? ITEMS.find(i => i.id === equipped.body)  : null
  const equippedLegs  = !equippedBody && equipped.legs  ? ITEMS.find(i => i.id === equipped.legs)  : null
  const equippedTorso = !equippedBody && equipped.torso ? ITEMS.find(i => i.id === equipped.torso) : null
  const equippedFeet  = equipped.feet  ? ITEMS.find(i => i.id === equipped.feet)  : null
  const equippedNeck  = equipped.neck  ? ITEMS.find(i => i.id === equipped.neck)  : null
  const equippedHead  = equipped.head  ? ITEMS.find(i => i.id === equipped.head)  : null

  const hideArms = !!(equippedTorso || equippedBody)
  const hideFeet = !!(equippedFeet || equippedUnderlayers.includes('socks'))

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
    // feet-left and feet-right belong to the feet slot item OR to socks as an underlayer
    if (key === 'feet-left' || key === 'feet-right') {
      const itemId = equipped[SLOT.FEET]
      if (itemId) return ITEMS.find(i => i.id === itemId) ?? null
      // socks is an underlayer that uses feet-left/feet-right — check equippedUnderlayers
      const socksEquipped = equippedUnderlayers.includes('socks')
      return socksEquipped ? (ITEMS.find(i => i.id === 'socks') ?? null) : null
    }
    // underbody → boxers underlayer
    if (key === 'underbody') {
      const boxersEquipped = equippedUnderlayers.includes('boxers')
      return boxersEquipped ? (ITEMS.find(i => i.id === 'boxers') ?? null) : null
    }
    // hands / hands-left / hands-right → gloves underlayer
    if (key === 'hands' || key === 'hands-left' || key === 'hands-right') {
      const glovesEquipped = equippedUnderlayers.includes('gloves')
      return glovesEquipped ? (ITEMS.find(i => i.id === 'gloves') ?? null) : null
    }
    // umbrella → underlayer (no longer a head slot item)
    if (key === 'umbrella') {
      const umbrellaEquipped = equippedUnderlayers.includes('umbrella')
      return umbrellaEquipped ? (ITEMS.find(i => i.id === 'umbrella') ?? null) : null
    }
    // wool-hat / helmet → head slot item when matching id equipped
    if (key === 'wool-hat' || key === 'helmet') {
      const headId = equipped[SLOT.HEAD]
      return headId === key ? (ITEMS.find(i => i.id === key) ?? null) : null
    }
    const itemId = equipped[key as SlotId]
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

        {/* Underlayer items — render at low z-index, always below outer clothing */}
        {ITEMS.filter(i => i.isUnderlayer && equippedUnderlayers.includes(i.id)).map(item => {
          const zIdx = item.layerZIndex ?? 1
          // Bug 3: skip socks when feet are already equipped (boots/trainers cover them)
          if (item.id === 'socks' && equippedFeet) return null
          if (item.isSplit && item.id === 'socks') {
            // Socks split rendering (left/right)
            return (
              <Fragment key={item.id}>
                <img
                  src={layerSocksLeft}
                  alt=""
                  className="absolute inset-0 h-full w-auto object-contain"
                  style={buildLayerStyle(zIdx, 'feet-left')}
                  draggable={false}
                  onPointerDown={e => handleLayerPointerDown('feet-left', e)}
                />
                <img
                  src={layerSocksRight}
                  alt=""
                  className="absolute inset-0 h-full w-auto object-contain"
                  style={buildLayerStyle(zIdx, 'feet-right')}
                  draggable={false}
                  onPointerDown={e => handleLayerPointerDown('feet-right', e)}
                />
              </Fragment>
            )
          }
          if (item.isSplit && item.id === 'gloves') {
            // Gloves split rendering (left/right) with per-outfit position overrides
            const GLOVES_OVERRIDES: Record<string, { 'hands-left': LayerAdjustment; 'hands-right': LayerAdjustment }> = {
              'shirt': {
                'hands-left':  { x: 6,   y: 105, scale: 1.15, rotate: -15 },
                'hands-right': { x: -6,  y: 106, scale: 1.15, rotate: 13 },
              },
              'pyjamas': {
                'hands-left':  { x: -1,  y: 189, scale: 1.10, rotate: -10 },
                'hands-right': { x: 10,  y: 86,  scale: 1.10, rotate: 10 },
              },
              'coat-winter': {
                'hands-left':  { x: -17, y: 77,  scale: 1.10, rotate: -7 },
                'hands-right': { x: 15,  y: 74,  scale: 1.10, rotate: 10 },
              },
            }
            function getGlovesAdj(slot: 'hands-left' | 'hands-right'): LayerAdjustment {
              const outfitOverride = GLOVES_OVERRIDES[equipped.torso ?? ''] ?? GLOVES_OVERRIDES[equipped.body ?? '']
              return outfitOverride?.[slot] ?? adjustments[slot]
            }
            function buildGlovesStyle(zIndex: number, slot: 'hands-left' | 'hands-right'): React.CSSProperties {
              const adj = getGlovesAdj(slot)
              const isSelected = selectedSlot === slot
              return {
                zIndex,
                transform: `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`,
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
            return (
              <Fragment key={item.id}>
                <img
                  src={layerGlovesLeft}
                  alt=""
                  className="absolute inset-0 h-full w-auto object-contain"
                  style={buildGlovesStyle(zIdx, 'hands-left')}
                  draggable={false}
                  onPointerDown={e => handleLayerPointerDown('hands-left', e)}
                />
                <img
                  src={layerGlovesRight}
                  alt=""
                  className="absolute inset-0 h-full w-auto object-contain"
                  style={buildGlovesStyle(zIdx, 'hands-right')}
                  draggable={false}
                  onPointerDown={e => handleLayerPointerDown('hands-right', e)}
                />
              </Fragment>
            )
          }
          if (item.id === 'umbrella') {
            // Umbrella: single image using its own adjustment key
            return (
              <img
                key="umbrella"
                src={getItemImage(item, true)}
                alt=""
                className="absolute inset-0 h-full w-auto object-contain"
                style={buildLayerStyle(zIdx, 'umbrella')}
                draggable={false}
                onPointerDown={e => handleLayerPointerDown('umbrella', e)}
              />
            )
          }
          // Determine which adjustment key to use for underlayer
          const adjKey: AdjustmentKey = item.id === 'boxers' ? 'underbody'
            : (item.slot as AdjustmentKey)
          return (
            <img
              key={item.id}
              src={getItemImage(item, true)}
              alt=""
              className="absolute inset-0 h-full w-auto object-contain"
              style={buildLayerStyle(zIdx, adjKey)}
              draggable={false}
              onPointerDown={e => handleLayerPointerDown(adjKey, e)}
            />
          )
        })}

        {/* z=2 — Legs layer (jeans / fish-trousers) */}
        {equippedLegs && (
          <img
            key={equippedLegs.id}
            src={getItemImage(equippedLegs, true)}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(2, SLOT.LEGS)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.LEGS, e)}
          />
        )}

        {/* z=3 — Body layer (pyjamas — base full-body, under torso) */}
        {equippedBody && (
          <img
            key={equippedBody.id}
            src={getItemImage(equippedBody, true)}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(3, SLOT.BODY)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.BODY, e)}
          />
        )}

        {/* z=4 — Torso layer (shirt / coat — goes over body) */}
        {equippedTorso && (
          <img
            key={equippedTorso.id}
            src={getItemImage(equippedTorso, true)}
            alt=""
            className="absolute inset-0 h-full w-auto object-contain"
            style={buildLayerStyle(4, SLOT.TORSO)}
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.TORSO, e)}
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
            src={getItemImage(equippedFeet, true)}
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
            src={getItemImage(equippedNeck, true)}
            style={buildLayerStyle(6, SLOT.NECK)}
            className="absolute inset-0 h-full w-auto object-contain"
            draggable={false}
            onPointerDown={e => handleLayerPointerDown(SLOT.NECK, e)}
          />
        )}

        {/* z=8 — Head layer (hat/wool-hat/helmet), each with its own adjustment key */}
        {equippedHead && (() => {
          const headKey: AdjustmentKey =
            equippedHead.id === 'wool-hat' ? 'wool-hat' :
            equippedHead.id === 'helmet'   ? 'helmet'   : SLOT.HEAD
          return (
            <img
              key={equippedHead.id}
              src={getItemImage(equippedHead, true)}
              alt=""
              className="absolute inset-0 h-full w-auto object-contain"
              style={buildLayerStyle(equippedHead.layerZ ?? 8, headKey)}
              draggable={false}
              onPointerDown={e => handleLayerPointerDown(headKey, e)}
            />
          )
        })()}

        {/* Hit zones for unequipping — tight divs per slot, only in normal mode */}
        {/* z-index matches the item's visual layer so topmost layer captures clicks first */}
        {!debugMode && (Object.entries(equipped) as [SlotId, string | null][]).map(([slotId, itemId]) => {
          if (!itemId) return null;
          const zone = SLOT_HIT_ZONES[slotId];
          if (!zone) return null;
          const item = ITEMS.find(i => i.id === itemId);
          if (!item) return null;
          // Use the item's visual layer z-index so higher layers capture events before lower ones
          const SLOT_Z: Record<SlotId, number> = { feet: 5, legs: 2, torso: 4, body: 3, neck: 6, head: 8 }
          const hitZ = item.layerZ ?? SLOT_Z[slotId] ?? 5
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
                zIndex: hitZ,
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

        {/* Hit zones for underlayer items — drag off Pete to unequip */}
        {/* z-index matches item.layerZIndex so underlayers stay below their covering equipped items */}
        {!debugMode && equippedUnderlayers.map(itemId => {
          const item = ITEMS.find(i => i.id === itemId);
          if (!item) return null;
          // Determine which hit zone to use for this underlayer
          const zoneKey = item.id === 'boxers' ? 'underbody'
            : item.id === 'socks' ? 'underfeet'
            : item.id === 'gloves' ? 'hands'
            : item.id === 'umbrella' ? 'hands'
            : null;
          if (!zoneKey) return null;
          const zone = SLOT_HIT_ZONES[zoneKey];
          if (!zone) return null;
          // Use the underlayer's own visual z-index for hit zone priority
          const hitZ = item.layerZIndex ?? 1
          return (
            <div
              key={`underlayer-${itemId}`}
              style={{
                position: 'absolute',
                left: '10%',
                width: '80%',
                top: `${zone.top * 100}%`,
                height: `${zone.height * 100}%`,
                cursor: 'grab',
                zIndex: hitZ,
                // Uncomment to debug: background: 'rgba(0,255,0,0.2)',
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUnderlayerPointerDown(item, e);
              }}
            />
          );
        })}
      </div>
    </div>
  )
}

// ── Ghost drag item (follows cursor) ──────────────────────────────────────────

function getGhostHeight(item: ClothingItem, closetAdj: Record<string, ClosetItemAdjustment>): string {
  const h = item.closetHeight ?? 'calc(551px * 0.30)'
  const scale = closetAdj[item.id]?.scale ?? 1
  const match = h.match(/calc\(551px \* ([\d.]+)\)/)
  if (match) {
    return `calc(551px * ${(parseFloat(match[1]) * scale).toFixed(4)})`
  }
  return h
}

interface GhostDragProps {
  drag: DragState
  closetAdjustments: Record<string, ClosetItemAdjustment>
}

function GhostDrag({ drag, closetAdjustments }: GhostDragProps) {
  return (
    <div
      className="absolute pointer-events-none z-50 flex flex-col items-center"
      style={{
        left: drag.x,
        top: drag.y,
      }}
    >
      <img
        src={drag.item.closetThumbnail ?? drag.item.thumbnail}
        alt={drag.item.word}
        className="object-contain"
        style={{
          height: getGhostHeight(drag.item, closetAdjustments),
          width: 'auto',
          objectFit: 'contain',
          transform: `translate(-50%, -50%) rotate(${drag.rotation ?? 0}deg)`,
          transition: 'transform 0.08s ease-out',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
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
  equippedUnderlayers: string[]
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
  equippedUnderlayers,
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

  // Build the list of adjustment keys to show in the layers panel.
  // Includes both normal slot items and underlayer items (socks, boxers, gloves, umbrella).
  const equippedKeys: AdjustmentKey[] = [
    // Normal slot items
    ...SLOT_ORDER.flatMap(slot => {
      if (equipped[slot] === null) return []
      if (slot === SLOT.FEET && feetIsSplit) return ['feet-left', 'feet-right'] as AdjustmentKey[]
      // HEAD: use item-specific key for wool-hat and helmet
      if (slot === SLOT.HEAD) {
        const id = equipped[slot]
        if (id === 'wool-hat') return ['wool-hat'] as AdjustmentKey[]
        if (id === 'helmet')   return ['helmet'] as AdjustmentKey[]
        return [slot as AdjustmentKey]
      }
      return [slot as AdjustmentKey]
    }),
    // Underlayer items — map each to its adjustment key
    ...ITEMS.filter(i => i.isUnderlayer && equippedUnderlayers.includes(i.id)).flatMap(item => {
      if (item.isSplit && item.id === 'socks') return ['feet-left', 'feet-right'] as AdjustmentKey[]
      if (item.isSplit && item.id === 'gloves') return ['hands-left', 'hands-right'] as AdjustmentKey[]
      if (item.id === 'boxers') return ['underbody'] as AdjustmentKey[]
      if (item.id === 'umbrella') return ['umbrella'] as AdjustmentKey[]
      return [(item.slot as AdjustmentKey)]
    }),
  ]

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

type Season = 'summer' | 'autumn' | 'night' | 'rain'

// ─── SVG helpers ──────────────────────────────────────────────
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(cx: number, cy: number, R: number, r: number, startDeg: number, endDeg: number) {
  const o1 = polarToXY(cx, cy, R, startDeg)
  const o2 = polarToXY(cx, cy, R, endDeg)
  const i1 = polarToXY(cx, cy, r, endDeg)
  const i2 = polarToXY(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${o1.x} ${o1.y} A ${R} ${R} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${r} ${r} 0 ${large} 0 ${i2.x} ${i2.y} Z`
}

// ─── Draw-style icons ─────────────────────────────────────────

// Sun — cartoon hand-drawn style with chunky rays
function SunIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {/* Glow circle behind */}
      <circle cx="16" cy="16" r="10" fill="#FFE566" opacity="0.4"/>
      {/* Main sun body */}
      <circle cx="16" cy="16" r="7" fill="#FFD700" stroke="#E8900A" strokeWidth="1.8"/>
      {/* Chunky irregular rays */}
      {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
        const r1 = 9.5 + (i%3)*0.5
        const r2 = 13 + (i%2)*0.8
        const rad = (deg - 90) * Math.PI / 180
        return <line key={deg}
          x1={16 + r1*Math.cos(rad)} y1={16 + r1*Math.sin(rad)}
          x2={16 + r2*Math.cos(rad)} y2={16 + r2*Math.sin(rad)}
          stroke="#E8900A" strokeWidth={1.8 + (i%2)*0.6} strokeLinecap="round"
        />
      })}
      {/* Face dots */}
      <circle cx="14" cy="16" r="1.2" fill="#E8900A"/>
      <circle cx="18" cy="16" r="1.2" fill="#E8900A"/>
    </svg>
  )
}

// Moon — crescent with draw-style texture
function MoonIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {/* Stars */}
      <circle cx="24" cy="8" r="1.5" fill="#E8E8FF" opacity="0.9"/>
      <circle cx="26" cy="15" r="1" fill="#E8E8FF" opacity="0.7"/>
      <circle cx="20" cy="6" r="1" fill="#E8E8FF" opacity="0.6"/>
      {/* Moon crescent */}
      <path d="M 20 6 A 10 10 0 1 0 20 26 A 7 7 0 1 1 20 6 Z"
        fill="#D4E8FF" stroke="#8899CC" strokeWidth="1.5"/>
      {/* Texture marks */}
      <circle cx="13" cy="14" r="2" fill="none" stroke="#8899CC" strokeWidth="1" opacity="0.4"/>
      <circle cx="16" cy="20" r="1.5" fill="none" stroke="#8899CC" strokeWidth="0.8" opacity="0.3"/>
    </svg>
  )
}

// Rain — cloud with drops
function RainIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {/* Cloud */}
      <ellipse cx="16" cy="12" rx="9" ry="6" fill="#8AAAD8"/>
      <ellipse cx="10" cy="14" rx="5" ry="4" fill="#8AAAD8"/>
      <ellipse cx="22" cy="14" rx="5" ry="4" fill="#8AAAD8"/>
      <ellipse cx="16" cy="16" rx="9" ry="4" fill="#6080C0"/>
      {/* Rain drops */}
      <line x1="10" y1="22" x2="8"  y2="28" stroke="#5080CC" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="22" x2="14" y2="28" stroke="#5080CC" strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="22" x2="20" y2="28" stroke="#5080CC" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// Leaf — uses the real autumn leaf PNG
function LeafIcon({ size = 22 }: { size?: number }) {
  return <img src={leafAutumnIcon} width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
}

// ─── Season color + label ──────────────────────────────────────
const SEASON_COLORS: Record<Season, string> = {
  summer: '#FFB800',
  autumn: '#E2580A',
  night:  '#7AAAFF',
  rain:   '#6090CC',
}

// ─── Half-donut wheel ─────────────────────────────────────────
// Half-donut: spans from -90° (left) to 90° (right) passing through 0° (top)
// 4 sectors × 45° each
const SECTOR_RANGES: Record<Season, [number, number]> = {
  autumn: [-90, -45],
  summer: [-45,   0],
  night:  [  0,  45],
  rain:   [ 45,  90],
}
// Icons at sector midpoints: autumn=-67.5°, summer=-22.5°, night=22.5°, rain=67.5°

function SeasonWheel({ season, onSelect }: { season: Season; onSelect: (s: Season) => void }) {
  const R = 52       // outer radius
  const r = 26       // inner hole radius
  const ICON_R = 40  // icon placement radius
  const PAD = 6
  const W = (R + PAD) * 2       // full circle width
  const H = R + r + PAD + 4     // only top half needed + center hole

  // Center of the FULL circle — at the bottom center of the SVG
  const cx = W / 2
  const cy = H  // center is at the bottom of the SVG

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 20,
      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
    }}>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {(Object.entries(SECTOR_RANGES) as [Season, [number,number]][]).map(([s, [start, end]]) => {
          const mid = (start + end) / 2
          const active = season === s
          const color = SEASON_COLORS[s]
          const iconPos = polarToXY(cx, cy, ICON_R, mid)

          return (
            <g key={s} onClick={() => onSelect(s)} style={{ cursor: 'pointer' }}>
              <path
                d={sectorPath(cx, cy, R, r, start, end)}
                fill={active ? color : 'rgba(20,20,30,0.75)'}
                stroke={active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={active ? 2 : 1}
                strokeLinejoin="round"
                style={{ transition: 'fill 0.2s' }}
              />
              <foreignObject
                x={iconPos.x - 12} y={iconPos.y - 12}
                width={24} height={24}
                style={{ pointerEvents: 'none', overflow: 'visible' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24,
                  opacity: active ? 1 : 0.5,
                  transform: active ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.2s',
                }}>
                  {s === 'summer' ? <SunIcon size={20}/>
                    : s === 'autumn' ? <LeafIcon size={20}/>
                    : s === 'rain' ? <RainIcon size={20}/>
                    : <MoonIcon size={20}/>}
                </div>
              </foreignObject>
            </g>
          )
        })}

        {/* Center dot at the base */}
        <circle cx={cx} cy={cy} r={r - 1}
          fill="rgba(10,10,20,0.8)"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1"
        />
        {/* Active icon in center */}
        <foreignObject x={cx-10} y={cy-r+4} width={20} height={20} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
            {season === 'summer' ? <SunIcon size={16}/>
              : season === 'autumn' ? <LeafIcon size={16}/>
              : season === 'rain' ? <RainIcon size={16}/>
              : <MoonIcon size={16}/>}
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
  rain:   windowRain,
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
  const [equippedUnderlayers, setEquippedUnderlayers] = useState<string[]>([])
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
  const closetAdjRef = useRef<Record<string, ClosetItemAdjustment>>({})
  const peteDragRef = useRef<{ startX: number; startY: number; startPeteX: number; startPeteY: number } | null>(null)
  const dragVelocityRef = useRef<{ prevClientX: number; prevTime: number } | null>(null)

  // Closet item per-item adjustments (position + scale, debug only)
  const [closetAdjustments, setClosetAdjustments] = useState<Record<string, ClosetItemAdjustment>>({
    'shirt':        { x: -34,   y: -97,  scale: 1.40 },
    'jeans':        { x: -31,   y: -90,  scale: 0.85 },
    'pyjamas':      { x: 69,    y: -106, scale: 1.25 },
    'hat':          { x: -1,    y: 23,   scale: 1.00 },
    'scarf':        { x: 51,    y: 75,   scale: 1.00 },
    'trainers':     { x: 17,    y: 12,   scale: 0.65 },
    'socks':        { x: -336,  y: 148,  scale: 1.65 },
    'cowboy-boots': { x: -34,   y: 14,   scale: 1.15 },
    'shorts':       { x: -89,   y: -79,  scale: 0.65 },
    'cap':          { x: 187,   y: -324, scale: 1.00 },
    'coat-winter':  { x: 17,    y: -96,  scale: 1.00 },
    'boxers':       { x: 18,    y: -99,  scale: 1.00 },
    'gloves':       { x: -307,  y: 125,  scale: 0.85 },
    'wool-hat':     { x: -12,   y: -334, scale: 1.00 },
    'helmet':       { x: -214,  y: -323, scale: 1.00 },
    'umbrella':     { x: 109,   y: 188,  scale: 2.15 },
  })

  // Keep closetAdjRef current so handlers always read up-to-date adjustments
  useEffect(() => {
    closetAdjRef.current = closetAdjustments
  }, [closetAdjustments])

  const peteRef = useRef<HTMLDivElement>(null)

  // ── Color palette state ──────────────────────────────────────────────────────

  // itemColors: item.id → target hue (null = original color)
  const [itemColors, setItemColors] = useState<Record<string, number | null>>({})
  // colorizedImages: "itemId|hue|layer" or "itemId|hue|thumb" → data URL
  const [colorizedImages, setColorizedImages] = useState<Record<string, string>>({})
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [colorTarget, setColorTarget] = useState<string | null>(null)
  const [paletteHovered, setPaletteHovered] = useState(false)

  // ── Preload Pete variant images on mount ────────────────────────────────────

  useEffect(() => {
    const srcs = [peteBase, peteNoArms, peteNoFeet, peteNoArmsNoFeet, roomBg,
      layerShirt, layerJeans, layerPyjamas, layerHat, layerScarf,
      layerTrainers, layerCowboyBoots, layerSocks, layerSocksLeft, layerSocksRight,
      windowSummer, windowAutumn, windowNight, windowRain,
      layerShorts, layerCap, layerCoatWinter,
      layerBoxers, layerGloves, layerGlovesLeft, layerGlovesRight, layerWoolHat, layerHelmet, layerUmbrella]
    srcs.forEach(src => { const img = new window.Image(); img.src = src })
  }, []);

  // ── Palette: auto-close / reset colorTarget when equipped items change ───────

  useEffect(() => {
    const slotColorizable = Object.values(equipped).filter(
      id => id && ITEMS.find(i => i.id === id)?.colorizable
    ) as string[]
    const underlayerColorizable = equippedUnderlayers.filter(
      id => ITEMS.find(i => i.id === id)?.colorizable
    )
    const equippedColorizable = [...slotColorizable, ...underlayerColorizable]
    if (equippedColorizable.length === 0) {
      setPaletteOpen(false)
      setColorTarget(null)
      return
    }
    // If current colorTarget is no longer equipped, reset to first available
    if (colorTarget && !equippedColorizable.includes(colorTarget)) {
      setColorTarget(equippedColorizable[0] ?? null)
    }
  }, [equipped, equippedUnderlayers, colorTarget])

  // ── Colorization: trigger canvas HSL replacement when itemColors changes ────

  useEffect(() => {
    Object.entries(itemColors).forEach(([itemId, hue]) => {
      if (hue === null) return
      const item = ITEMS.find(i => i.id === itemId)
      if (!item?.colorizable || item.baseHue === undefined) return

      const sources: Array<{ src: string; cacheKey: string }> = [
        { src: item.layer, cacheKey: `${itemId}|${hue}|layer` },
        { src: item.closetThumbnail ?? item.thumbnail, cacheKey: `${itemId}|${hue}|thumb` },
      ]

      sources.forEach(({ src, cacheKey }) => {
        setColorizedImages(prev => {
          if (prev[cacheKey]) return prev // already cached, skip
          colorizeImage(src, hue, item.baseHue!, 38, item.isWhiteBase ?? false).then(dataUrl => {
            setColorizedImages(p => ({ ...p, [cacheKey]: dataUrl }))
          })
          return prev
        })
      })
    })
  }, [itemColors])

  // ── getItemImage: resolve effective image URL for an item ────────────────────

  function getItemImage(item: ClothingItem, forPete = false): string {
    const hue = itemColors[item.id]
    const base = forPete ? item.layer : (item.closetThumbnail ?? item.thumbnail)
    if (hue === null || hue === undefined) return base

    const suffix = forPete ? 'layer' : 'thumb'
    const cacheKey = `${item.id}|${hue}|${suffix}`

    // Return cached result if ready
    if (colorizedImages[cacheKey]) return colorizedImages[cacheKey]

    // Cache miss — show any OTHER cached color for this item as intermediate (prevents flash to original)
    const fallbackKey = Object.keys(colorizedImages).find(
      k => k.startsWith(`${item.id}|`) && k.endsWith(`|${suffix}`)
    )
    return fallbackKey ? colorizedImages[fallbackKey] : base
  }

  // ── Drag: global pointer events ─────────────────────────────────────────────

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      const s = scaleRef.current
      const canvas = canvasRef.current

      // Velocity-based tilt
      const now = Date.now()
      const vel = dragVelocityRef.current
      const dt = vel ? now - vel.prevTime : 0
      const prevX = vel ? vel.prevClientX : e.clientX
      const vx = dt > 5 ? (e.clientX - prevX) / dt : 0  // px/ms
      const targetRotation = Math.max(-35, Math.min(35, vx * 32))
      if (dragVelocityRef.current) {
        dragVelocityRef.current.prevClientX = e.clientX
        dragVelocityRef.current.prevTime = now
      }

      if (!canvas) {
        setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY, rotation: targetRotation } : null))
        return
      }
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / s
      const y = (e.clientY - rect.top)  / s
      setDrag(d => (d ? { ...d, x, y, rotation: targetRotation } : null))
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
            if (current.item.isUnderlayer) {
              // Underlayer item dropped onto Pete → toggle underlayer (deduplicated)
              setEquippedUnderlayers(prev =>
                prev.includes(current.item.id)
                  ? prev.filter(id => id !== current.item.id)
                  : [...prev, current.item.id]
              )
            } else {
              // Normal slot item dropped onto Pete → equip in slot
              setEquipped(eq => ({ ...eq, [current.item.slot]: current.item.id }))
              if (current.item.defaultAdjustment) {
                // HEAD items each use their own key; all others use the slot key
                const adjKey: AdjustmentKey =
                  current.item.id === 'wool-hat' ? 'wool-hat' :
                  current.item.id === 'helmet'   ? 'helmet'   :
                  current.item.slot
                setAdjustments(prev => ({
                  ...prev,
                  [adjKey]: { ...DEFAULT_ADJUSTMENT, ...current.item.defaultAdjustment },
                }))
              }
            }
            setLastWord({ word: current.item.word, label: current.item.label })
          } else if (!onPete && current.wasEquipped) {
            if (current.item.isUnderlayer) {
              // Underlayer item dragged away from Pete → remove from underlayers
              setEquippedUnderlayers(prev => prev.filter(id => id !== current.item.id))
            } else {
              // Equipped slot item dragged away from Pete → unequip
              setEquipped(eq => ({ ...eq, [current.item.slot]: null }))
            }
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

  const equippedIds = new Set([
    ...Object.values(equipped).filter((v): v is string => v !== null),
    ...equippedUnderlayers,
  ])
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
    dragVelocityRef.current = { prevClientX: e.clientX, prevTime: Date.now() }
    setDrag({ item, x, y, wasEquipped: isEquipped, rotation: 0 })
  }

  function startUnderlayerDrag(item: ClothingItem, e: React.PointerEvent) {
    // Called when the user grabs an underlayer item from Pete's body hit zone
    if (debugMode) return
    e.preventDefault()
    e.stopPropagation()
    setHoveredId(undefined)
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    dragVelocityRef.current = { prevClientX: e.clientX, prevTime: Date.now() }
    setDrag({ item, x, y, wasEquipped: true, rotation: 0 })
  }

  function startEquippedDrag(item: ClothingItem, e: React.PointerEvent) {
    // Called when the user grabs a layer directly from Pete's body
    if (debugMode) return
    e.preventDefault()
    e.stopPropagation()
    setHoveredId(undefined)
    const { x, y } = clientToCanvas(e.clientX, e.clientY)
    dragVelocityRef.current = { prevClientX: e.clientX, prevTime: Date.now() }
    setDrag({ item, x, y, wasEquipped: true, rotation: 0 })
  }

  function handleClosetAdjPointerDown(id: string, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const current = closetAdjRef.current[id] ?? { x: 0, y: 0, scale: 1 }
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

  // ── Color swatches constant ──────────────────────────────────────────────────

  const COLOR_SWATCHES = [
    { hue: 0,   label: 'Red',    hex: '#E83030' },
    { hue: 25,  label: 'Orange', hex: '#E87A20' },
    { hue: 50,  label: 'Yellow', hex: '#F5C800' },
    { hue: 120, label: 'Green',  hex: '#30B840' },
    { hue: 190, label: 'Teal',   hex: '#20B8C8' },
    { hue: 220, label: 'Blue',   hex: '#2050D8' },
    { hue: 270, label: 'Purple', hex: '#8030C8' },
    { hue: 320, label: 'Pink',   hex: '#E030A8' },
  ] as const

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
        getItemImage={getItemImage}
      />

      {/* Pete character with stacked layers */}
      <Pete
        peteRef={peteRef}
        equipped={equipped}
        equippedUnderlayers={equippedUnderlayers}
        debugMode={debugMode}
        peteOffset={peteOffset}
        peteDebugActive={debugMode && debugTarget === 'pete'}
        adjustments={adjustments}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlot}
        onDebugPointerDown={handleDebugPointerDown}
        onEquippedPointerDown={startEquippedDrag}
        onUnderlayerPointerDown={startUnderlayerDrag}
        onPetePointerDown={handlePetePointerDown}
        onPetePointerMove={handlePetePointerMove}
        onPetePointerUp={handlePetePointerUp}
        getItemImage={getItemImage}
      />

      {/* Ghost drag item */}
      {drag && <GhostDrag drag={drag} closetAdjustments={closetAdjustments} />}

      {/* Vocabulary badge */}
      {lastWord && <VocabBadge word={lastWord} />}

      {/* Palette button — fades in/out when colorizable items are equipped */}
      {(() => {
        const hasColorizable =
          Object.values(equipped).some(id => id && ITEMS.find(i => i.id === id)?.colorizable) ||
          equippedUnderlayers.some(id => ITEMS.find(i => i.id === id)?.colorizable)
        return (
          <button
            onClick={() => {
              if (!hasColorizable) return
              const newOpen = !paletteOpen
              setPaletteOpen(newOpen)
              if (newOpen && !colorTarget) {
                const firstColorizable =
                  Object.values(equipped).find(id => id && ITEMS.find(i => i.id === id)?.colorizable) ??
                  equippedUnderlayers.find(id => ITEMS.find(i => i.id === id)?.colorizable)
                if (firstColorizable) setColorTarget(firstColorizable)
              }
            }}
            onMouseEnter={() => setPaletteHovered(true)}
            onMouseLeave={() => setPaletteHovered(false)}
            style={{
              position: 'absolute', bottom: 120, left: 16,
              width: 68, height: 68, borderRadius: '50%',
              background: 'none', border: 'none', cursor: hasColorizable ? 'pointer' : 'default',
              padding: 0, zIndex: 15,
              opacity: hasColorizable ? 1 : 0,
              pointerEvents: hasColorizable ? 'auto' : 'none',
              outline: (paletteOpen || paletteHovered) ? '3px solid white' : 'none',
              outlineOffset: 2,
              filter: paletteOpen
                ? 'drop-shadow(0 0 8px rgba(255,200,0,0.9))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              transition: 'opacity 0.2s, filter 0.2s',
            }}
            title="Change color"
          >
            <img src={paletteIcon} style={{ width: 68, height: 68, objectFit: 'contain' }} alt="palette" />
          </button>
        )
      })()}

      {/* Color picker panel */}
      {paletteOpen && (
        <div style={{
          position: 'absolute',
          left: 16,
          bottom: 200,
          background: 'rgba(10,10,20,0.90)',
          backdropFilter: 'blur(8px)',
          borderRadius: 14,
          padding: 10,
          border: '1px solid rgba(255,255,255,0.15)',
          zIndex: 16,
          width: 195,
        }}>
          {/* Item selector — scrollable row */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
            {[
              ...Object.values(equipped).filter((id): id is string => !!id && !!ITEMS.find(i => i.id === id)?.colorizable),
              ...equippedUnderlayers.filter(id => ITEMS.find(i => i.id === id)?.colorizable),
            ]
              .map(id => {
                const item = ITEMS.find(i => i.id === id)!
                return (
                  <button
                    key={id}
                    onClick={() => setColorTarget(id)}
                    style={{
                      padding: '3px 8px', borderRadius: 8, fontSize: 11,
                      background: colorTarget === id ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${colorTarget === id ? '#facc15' : 'rgba(255,255,255,0.15)'}`,
                      color: colorTarget === id ? '#facc15' : '#ccc',
                      cursor: 'pointer',
                    }}
                  >
                    {item.word}
                  </button>
                )
              })}
          </div>

          {/* Color grid: 4 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
            {/* Reset button first */}
            <button
              onClick={() => {
                if (colorTarget) setItemColors(prev => ({ ...prev, [colorTarget]: null }))
              }}
              title="Original"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: colorTarget && (itemColors[colorTarget] === null || itemColors[colorTarget] === undefined)
                  ? '3px solid white'
                  : '2px solid rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↩
            </button>

            {/* 8 color swatches */}
            {COLOR_SWATCHES.map(({ hue, hex, label }) => {
              const isActive = colorTarget ? itemColors[colorTarget] === hue : false
              return (
                <button
                  key={hue}
                  onClick={() => {
                    if (colorTarget) setItemColors(prev => ({ ...prev, [colorTarget]: hue }))
                  }}
                  title={label}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: hex,
                    border: isActive ? '3px solid white' : '2px solid rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s',
                    boxShadow: isActive ? `0 0 10px ${hex}` : 'none',
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Debug panel */}
      {debugMode && (
        <DebugPanel
          equipped={equipped}
          equippedUnderlayers={equippedUnderlayers}
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

      {/* Debug toggle button */}
      <button
        onClick={toggleDebug}
        className="z-50 flex items-center justify-center shadow-lg"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          border: 'none',
          outline: debugMode ? '2px solid #facc15' : 'none',
        }}
        title="Toggle debug"
      >
        <span
          className="leading-none select-none"
          style={{
            fontSize: 14,
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
