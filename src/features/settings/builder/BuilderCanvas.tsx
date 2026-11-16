import { useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import type { FooterBlock, FooterBlockType, FooterBuilder, FooterColumn, FooterRow } from '../types'
import { blockLabels } from './model'
import { FooterBlockContent, type FooterContentProps } from './FooterContent'

export type BuilderSelection = { kind: 'row' | 'block'; id: string } | null
export type ContentContext = Omit<FooterContentProps, 'block'>

const blockTypes = Object.keys(blockLabels) as FooterBlockType[]
const aligns = [
  { value: 'left', icon: AlignLeft, label: 'Căn trái' },
  { value: 'center', icon: AlignCenter, label: 'Căn giữa' },
  { value: 'right', icon: AlignRight, label: 'Căn phải' },
] as const

function AddBlockMenu({ onAdd }: { onAdd: (type: FooterBlockType) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="builder-add"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        className="builder-add-btn"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Plus size={13} />
        Thêm khối
      </button>
      {open && (
        <div className="builder-add-menu" role="menu">
          {blockTypes.map((type) => (
            <button
              type="button"
              role="menuitem"
              key={type}
              onClick={() => {
                setOpen(false)
                onAdd(type)
              }}
            >
              {blockLabels[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CanvasBlock({
  block,
  selected,
  onSelect,
  onPatch,
  onResize,
  onDuplicate,
  onDelete,
  context,
}: {
  block: FooterBlock
  selected: boolean
  onSelect: () => void
  onPatch: (values: Partial<FooterBlock>) => void
  onResize: (width: number) => void
  onDuplicate: () => void
  onDelete: () => void
  context: ContentContext
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { kind: 'block' },
  })
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const resizable = block.type === 'logo' || block.type === 'image'
  const shown = liveWidth ? { ...block, width: liveWidth, height: 0 } : block
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const sign = block.align === 'right' ? -1 : 1
    let width = block.width
    const move = (e: PointerEvent) => {
      width = Math.round(Math.max(32, Math.min(1200, block.width + (e.clientX - startX) * sign)))
      setLiveWidth(width)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setLiveWidth(null)
      if (width !== block.width) onResize(width)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return (
    <div
      ref={setNodeRef}
      className={`builder-block ${selected ? 'is-selected' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <div className="builder-block-bar">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Kéo ${blockLabels[block.type]}`}
        >
          <GripVertical size={13} />
        </button>
        <button type="button" className="builder-block-label" onClick={onSelect}>
          {blockLabels[block.type]}
        </button>
        {selected && (
          <>
            {aligns.map(({ value, icon: Icon, label }) => (
              <button
                type="button"
                key={value}
                aria-label={label}
                aria-pressed={block.align === value}
                className={block.align === value ? 'is-active' : ''}
                onClick={() => onPatch({ align: value })}
              >
                <Icon size={13} />
              </button>
            ))}
            <button type="button" aria-label="Nhân bản khối" onClick={onDuplicate}>
              <Copy size={13} />
            </button>
            <button type="button" aria-label="Xóa khối" onClick={onDelete}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
      <div
        className="builder-block-body"
        role="button"
        tabIndex={0}
        aria-label={`Chỉnh sửa ${blockLabels[block.type]}`}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
      >
        <div inert>
          <FooterBlockContent block={shown} {...context} />
          {block.type === 'links' && block.source === 'custom' && !block.links.length && (
            <p className="builder-hint">Chọn khối để thêm liên kết</p>
          )}
        </div>
        {(block.hidden_desktop || block.hidden_mobile) && (
          <small className="builder-hidden-label">
            Ẩn trên {block.hidden_desktop ? 'desktop' : ''}
            {block.hidden_desktop && block.hidden_mobile ? ', ' : ''}
            {block.hidden_mobile ? 'mobile' : ''}
          </small>
        )}
        {selected && resizable && (
          <button
            type="button"
            className="builder-resize"
            aria-label="Kéo để đổi kích thước"
            title="Kéo để đổi kích thước"
            onPointerDown={startResize}
            onClick={(event) => event.stopPropagation()}
          />
        )}
      </div>
    </div>
  )
}

function CanvasColumn({
  column,
  children,
  number,
  onAdd,
}: {
  column: FooterColumn
  children: ReactNode
  number: number
  onAdd: (type: FooterBlockType) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { kind: 'column' } })
  return (
    <div ref={setNodeRef} className={`builder-column ${isOver ? 'is-over' : ''}`}>
      <span className="builder-column-label">Cột {number}</span>
      <SortableContext
        items={column.blocks.map((block) => block.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      {!column.blocks.length && <div className="builder-column-empty">Cột trống</div>}
      {column.blocks.length < 30 && <AddBlockMenu onAdd={onAdd} />}
    </div>
  )
}

function CanvasRow({
  row,
  index,
  selected,
  onSelect,
  onMove,
  children,
}: {
  row: FooterRow
  index: number
  selected: boolean
  onSelect: () => void
  onMove: (direction: number) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    data: { kind: 'row' },
  })
  return (
    <section
      ref={setNodeRef}
      className={`builder-row ${selected ? 'is-selected' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        backgroundColor: row.background || undefined,
        color: row.color || undefined,
      }}
    >
      <div className="builder-row-bar">
        <button type="button" {...attributes} {...listeners} aria-label={`Kéo hàng ${index + 1}`}>
          <GripVertical size={14} />
        </button>
        <button type="button" onClick={onSelect}>
          Hàng {index + 1} · {row.columns.length} cột
        </button>
        <span className="flex-1" />
        <button
          type="button"
          aria-label={`Đưa hàng ${index + 1} lên`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={13} />
        </button>
        <button type="button" aria-label={`Đưa hàng ${index + 1} xuống`} onClick={() => onMove(1)}>
          <ArrowDown size={13} />
        </button>
      </div>
      <div
        className="builder-row-grid"
        style={{
          gridTemplateColumns: row.columns
            .map((column) => `minmax(0, ${column.width}fr)`)
            .join(' '),
          gap: row.gap,
          padding: row.padding,
        }}
      >
        {children}
      </div>
    </section>
  )
}

export function BuilderCanvas({
  layout,
  selection,
  setSelection,
  preview,
  mobile,
  context,
  onAddBlock,
  onPatchBlock,
  onResizeBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onMoveRow,
}: {
  layout: FooterBuilder
  selection: BuilderSelection
  setSelection: (value: BuilderSelection) => void
  preview: boolean
  mobile: boolean
  context: ContentContext
  onAddBlock: (type: FooterBlockType, columnId: string) => void
  onPatchBlock: (block: FooterBlock, values: Partial<FooterBlock>) => void
  onResizeBlock: (block: FooterBlock, width: number) => void
  onDuplicateBlock: (id: string) => void
  onDeleteBlock: (id: string) => void
  onMoveRow: (id: string, direction: number) => void
}) {
  const style = {
    backgroundColor: layout.background,
    color: layout.color,
    '--fb-link-color': layout.link_color,
    '--fb-block-gap': `${layout.gap}px`,
  } as CSSProperties
  return (
    <div
      className={`builder-canvas ${mobile ? 'is-mobile' : ''} ${preview ? 'is-preview' : ''}`}
      style={style}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('a')) event.preventDefault()
      }}
    >
      {layout.show_statistics && (
        <div className="builder-statistics">
          <span>Thống kê truy cập</span>
          <small>Số liệu thực tế hiển thị trên website</small>
        </div>
      )}
      <SortableContext
        items={layout.rows.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        {layout.rows.map((row, ri) =>
          preview ? (
            <section
              key={row.id}
              style={{
                backgroundColor: row.background || undefined,
                color: row.color || undefined,
              }}
            >
              <div
                className="fb-layout-row"
                style={
                  {
                    maxWidth: layout.max_width,
                    margin: '0 auto',
                    padding: row.padding,
                    '--fb-columns': row.columns
                      .map((column) => `minmax(0, ${column.width}fr)`)
                      .join(' '),
                    '--fb-row-gap': `${row.gap}px`,
                    '--fb-tablet-columns': `repeat(${Math.min(2, row.columns.length)}, minmax(0, 1fr))`,
                  } as CSSProperties
                }
              >
                {row.columns.map((column) => (
                  <div className="fb-layout-column" key={column.id}>
                    {column.blocks
                      .filter((block) => (mobile ? !block.hidden_mobile : !block.hidden_desktop))
                      .map((block) => (
                        <div key={block.id} inert>
                          <FooterBlockContent block={block} {...context} />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <CanvasRow
              key={row.id}
              row={row}
              index={ri}
              selected={selection?.id === row.id}
              onSelect={() => setSelection({ kind: 'row', id: row.id })}
              onMove={(direction) => onMoveRow(row.id, direction)}
            >
              {row.columns.map((column, ci) => (
                <CanvasColumn
                  key={column.id}
                  column={column}
                  number={ci + 1}
                  onAdd={(type) => onAddBlock(type, column.id)}
                >
                  {column.blocks.map((block) => (
                    <CanvasBlock
                      key={block.id}
                      block={block}
                      selected={selection?.id === block.id}
                      onSelect={() => setSelection({ kind: 'block', id: block.id })}
                      onPatch={(values) => onPatchBlock(block, values)}
                      onResize={(width) => onResizeBlock(block, width)}
                      onDuplicate={() => onDuplicateBlock(block.id)}
                      onDelete={() => onDeleteBlock(block.id)}
                      context={context}
                    />
                  ))}
                </CanvasColumn>
              ))}
            </CanvasRow>
          )
        )}
      </SortableContext>
      {!layout.rows.length && (
        <div className="builder-empty">
          Chưa có hàng nào. Chọn “Thêm hàng” để bắt đầu xây dựng footer.
        </div>
      )}
    </div>
  )
}
