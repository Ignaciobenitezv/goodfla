'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

/** ==== Tipos ==== */
export type Variant = {
  color: string
  colorHex?: string
  sizes: string[]
}

export type CatalogProduct = {
  id: string
  name: string
  category: string
  price: number
  images: string[]
  variants: Variant[]
}

export type ComboConfig = {
  id: string
  title: string
  slots: number
  comboPrice: number
  compareAtPrice: number
  allowedCategory?: string
  description?: string
}

/** ==== Componentes UI simples ==== */
function ColorSwatch({
  hex,
  selected,
  onClick,
  label,
}: { hex?: string; selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`h-8 w-8 rounded-full border-2 transition
        ${selected ? 'border-marca-amarillo scale-105' : 'border-black/20'}
      `}
      style={{ background: hex || '#EEE' }}
    />
  )
}

function SizeChip({
  size,
  selected,
  onClick,
}: { size: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition
        ${selected ? 'bg-marca-amarillo text-marca-negro border-marca-amarillo' : 'border-black/20 hover:bg-black/5'}
      `}
    >
      {size}
    </button>
  )
}

/** ==== Picker Modal ==== */
function PickerModal({
  open,
  onClose,
  catalog,
  allowedCategory,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  catalog: CatalogProduct[]
  allowedCategory?: string
  onConfirm: (p: { productId: string; color: string; size: string }) => void
}) {
  const products = useMemo(
    () => catalog.filter(p => !allowedCategory || p.category === allowedCategory),
    [catalog, allowedCategory]
  )

  const [step, setStep] = useState<'list' | 'variant'>('list')
  const [picked, setPicked] = useState<CatalogProduct | null>(null)
  const [color, setColor] = useState<string>('')
  const [size, setSize] = useState<string>('')

  const reset = () => {
    setStep('list'); setPicked(null); setColor(''); setSize('')
  }

  const confirm = () => {
    if (!picked || !color || !size) return
    onConfirm({ productId: picked.id, color, size })
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[500]">
      <div className="absolute inset-0 bg-black/40" onClick={() => { reset(); onClose(); }} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-1/2 top-1/2 w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{step === 'list' ? 'Elegí un producto' : 'Elegí color y talle'}</h3>
          <button onClick={() => { reset(); onClose(); }} className="text-marca-gris">✕</button>
        </div>

        {step === 'list' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 max-h-[70vh] overflow-auto">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => { setPicked(p); setStep('variant'); }}
                className="group rounded-xl border hover:shadow-md transition overflow-hidden text-left"
              >
                <div className="relative h-40 w-full">
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm text-marca-gris mb-1">{p.name}</p>
                  <p className="text-xs text-marca-gris/60">${p.price.toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'variant' && picked && (
          <div className="p-4 space-y-5">
            <div className="flex gap-4">
              <div className="relative h-40 w-40 rounded-lg overflow-hidden shrink-0">
                <Image src={picked.images[0]} alt={picked.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-marca-gris">{picked.name}</p>
                <p className="text-sm text-marca-gris/60 mb-2">${picked.price.toLocaleString()}</p>

                <div className="mb-3">
                  <p className="text-xs mb-2">Color</p>
                  <div className="flex gap-2">
                    {picked.variants.map(v => (
                      <ColorSwatch
                        key={v.color}
                        hex={v.colorHex}
                        label={v.color}
                        selected={color === v.color}
                        onClick={() => { setColor(v.color); setSize(''); }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-2">Talle</p>
                  <div className="flex flex-wrap gap-2">
                    {picked.variants.find(v => v.color === color)?.sizes.map(s => (
                      <SizeChip key={s} size={s} selected={size === s} onClick={() => setSize(s)} />
                    )) || <p className="text-xs text-marca-gris/60">Elegí un color para ver talles</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button className="px-4 py-2 rounded-full border" onClick={() => setStep('list')}>Volver</button>
              <button
                onClick={confirm}
                disabled={!picked || !color || !size}
                className={`px-5 py-2 rounded-full font-medium
                  ${(!picked || !color || !size) ? 'bg-black/10 text-black/50' : 'bg-marca-gris text-white hover:opacity-90'}
                `}
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/** ==== Slot ==== */
function SlotCard({
  index,
  item,
  onAdd,
  onEdit,
  onRemove,
}: {
  index: number
  item?: { product: CatalogProduct; color: string; size: string }
  onAdd: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  if (!item) {
    return (
      <button
        onClick={onAdd}
        className="h-36 md:h-40 border-2 border-dashed border-black/30 rounded-xl flex items-center justify-center hover:bg-black/5 transition"
      >
        <div className="text-center">
          <div className="text-2xl">＋</div>
          <p className="text-xs text-marca-gris/70">Agregar producto {index + 1}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="h-36 md:h-40 border rounded-xl overflow-hidden flex">
      <div className="relative w-32 h-full shrink-0">
        <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
      </div>
      <div className="flex-1 p-3">
        <p className="text-sm font-medium text-marca-gris">{item.product.name}</p>
        <p className="text-xs text-marca-gris/70">
          {item.color} · Talle {item.size}
        </p>
        <div className="mt-2 flex gap-2">
          <button onClick={onEdit} className="text-xs px-3 py-1 rounded-full border hover:bg-black/5">Editar</button>
          <button onClick={onRemove} className="text-xs px-3 py-1 rounded-full border text-red-600 hover:bg-red-50">Quitar</button>
        </div>
      </div>
    </div>
  )
}

/** ==== Configurador principal ==== */
export default function ComboConfigurator({
  config,
  catalog,
}: {
  config: ComboConfig
  catalog: CatalogProduct[]
}) {
  const [pickerOpenFor, setPickerOpenFor] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ product: CatalogProduct; color: string; size: string } | undefined>>(
    Array(config.slots).fill(undefined)
  )

  const filled = items.filter(Boolean) as NonNullable<typeof items[number]>[]
  const subtotal = filled.reduce((acc, it) => acc + it.product.price, 0)
  const ahorroAbs = Math.max(0, subtotal - config.comboPrice)
  const ahorroPct = subtotal ? Math.round((ahorroAbs / subtotal) * 100) : 0

  const openPicker = (i: number) => setPickerOpenFor(i)
  const closePicker = () => setPickerOpenFor(null)

  const handleConfirm = (picked: { productId: string; color: string; size: string }) => {
    const prod = catalog.find(p => p.id === picked.productId)!
    const next = [...items]
    next[pickerOpenFor as number] = { product: prod, color: picked.color, size: picked.size }
    setItems(next)
  }

  const removeAt = (i: number) => {
    const next = [...items]; next[i] = undefined; setItems(next)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Galería simple del combo */}
      <div className="space-y-3">
        <div className="relative w-full h-[420px] rounded-2xl overflow-hidden bg-black/5">
          {/* Podés pasar una imagen “cover” del combo; de momento usamos la del primer producto si existe */}
          {filled[0]?.product.images[0] ? (
            <Image src={filled[0].product.images[0]} alt={config.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-marca-gris/40">
              Agregá un producto para previsualizar
            </div>
          )}
        </div>
        <p className="text-sm text-marca-gris/60">Elegí colores y talles</p>
      </div>

      {/* Configurador */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-marca-gris mb-1">{config.title}</h1>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-marca-amarillo text-2xl font-bold">
            ${config.comboPrice.toLocaleString()}
          </span>
          <span className="text-marca-gris/50 line-through">
            ${subtotal ? subtotal.toLocaleString() : config.compareAtPrice.toLocaleString()}
          </span>
          {ahorroAbs > 0 && (
            <span className="bg-red-500/10 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
              AHORRÁS ${ahorroAbs.toLocaleString()} ({ahorroPct}%)
            </span>
          )}
        </div>

        <div className="mb-4">
          <button className="text-sm font-semibold underline">GUÍA DE TALLES</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {items.map((it, i) => (
            <SlotCard
              key={i}
              index={i}
              item={it}
              onAdd={() => openPicker(i)}
              onEdit={() => openPicker(i)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>

        <button
          disabled={items.some(it => !it)}
          className={`w-full rounded-full py-3 font-semibold transition
            ${items.some(it => !it) ? 'bg-black/10 text-black/50' : 'bg-marca-gris text-white hover:opacity-90'}
          `}
        >
          IR A PAGAR
        </button>

        {config.description && <p className="text-sm text-marca-gris/70 mt-4">{config.description}</p>}
      </div>

      <AnimatePresence>
        {pickerOpenFor !== null && (
          <PickerModal
            open
            onClose={closePicker}
            catalog={catalog}
            allowedCategory={config.allowedCategory}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
