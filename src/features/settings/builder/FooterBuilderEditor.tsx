import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Eye,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  Redo2,
  Save,
  Settings2,
  Smartphone,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { getMediaUrl } from '@/features/articles/utils/media'
import defaultSiteLogo from '@/assets/site-logo.webp'
import type { FooterBlockType, SiteSettings } from '../types'
import { settingService } from '../services/settingService'
import { BlockInspector } from './BlockInspector'
import { BuilderCanvas, type BuilderSelection } from './BuilderCanvas'
import { LayoutInspector, RowInspector } from './LayoutInspector'
import { blockLabels, createBlock, createRow, duplicateBlock, findBlock, moveBlock } from './model'
import type { BuilderHistory } from './useBuilderHistory'
import './footer-content.css'
import './builder.css'

const collisionDetection: CollisionDetection = (args) => {
  const row = args.active.data.current?.kind === 'row'
  const filtered = {
    ...args,
    droppableContainers: args.droppableContainers.filter((container) =>
      row
        ? container.data.current?.kind === 'row'
        : ['block', 'column'].includes(container.data.current?.kind)
    ),
  }
  const hits = pointerWithin(filtered)
  if (hits.length) {
    const block = hits.find(
      (hit) =>
        filtered.droppableContainers.find((container) => container.id === hit.id)?.data.current
          ?.kind === 'block'
    )
    return block ? [block] : hits
  }
  return closestCenter(filtered)
}

export function FooterBuilderEditor({
  history,
  settings,
  disabled,
  onUploadStateChange,
}: {
  history: BuilderHistory
  settings: SiteSettings
  disabled: boolean
  onUploadStateChange: (busy: boolean) => void
}) {
  const { value: layout, commit } = history
  const [selection, setSelection] = useState<BuilderSelection>(null)
  const [locale, setLocale] = useState<'vi' | 'en'>('vi')
  const [mobile, setMobile] = useState(false)
  const [preview, setPreview] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const navigationQuery = useQuery({
    queryKey: ['footer-preview-menu', locale],
    queryFn: () => settingService.getFooterNavigation(locale),
    retry: false,
  })
  const dynamicQuery = useQuery({
    queryKey: ['footer-preview-dynamic', locale],
    queryFn: () => settingService.getFooterDynamicData(locale),
    retry: false,
  })
  const selectedBlock = selection?.kind === 'block' ? findBlock(layout, selection.id) : undefined
  const selectedRow =
    selection?.kind === 'row' ? layout.rows.find((row) => row.id === selection.id) : undefined
  const context = {
    settings,
    locale,
    resolveMedia: getMediaUrl,
    defaultLogo: defaultSiteLogo,
    navigation: navigationQuery.data || [],
    dynamicData: dynamicQuery.data,
  }

  const addBlock = (type: FooterBlockType, columnId?: string, index?: number) => {
    const next = structuredClone(layout)
    if (!next.rows.length) next.rows.push(createRow())
    const target = columnId
      ? next.rows.flatMap((row) => row.columns).find((column) => column.id === columnId)
      : selectedBlock
        ? next.rows
            .flatMap((row) => row.columns)
            .find((column) => column.id === selectedBlock.column.id)
        : selectedRow
          ? next.rows.find((row) => row.id === selectedRow.id)?.columns[0]
          : next.rows[0].columns[0]
    if (!target || target.blocks.length >= 30) {
      toast.error('Mỗi cột chứa tối đa 30 khối.')
      return
    }
    const block = createBlock(type)
    target.blocks.splice(index ?? target.blocks.length, 0, block)
    commit(next)
    setSelection({ kind: 'block', id: block.id })
  }
  const addRow = () => {
    const row = createRow(3)
    commit({ ...layout, rows: [...layout.rows, row] })
    setSelection({ kind: 'row', id: row.id })
  }
  const reorderRow = (id: string, direction: number) => {
    const from = layout.rows.findIndex((row) => row.id === id)
    const to = from + direction
    if (to < 0 || to >= layout.rows.length) return
    const rows = [...layout.rows]
    const [row] = rows.splice(from, 1)
    rows.splice(to, 0, row)
    commit({ ...layout, rows })
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveLabel(null)
    if (!over || active.id === over.id) return
    if (active.data.current?.kind === 'row') {
      const from = layout.rows.findIndex((row) => row.id === active.id)
      const to = layout.rows.findIndex((row) => row.id === over.id)
      if (from >= 0 && to >= 0) reorderRow(String(active.id), to - from)
      return
    }
    const targetBlock = findBlock(layout, String(over.id))
    const targetColumn =
      targetBlock?.column ||
      layout.rows.flatMap((row) => row.columns).find((column) => column.id === over.id)
    if (!targetColumn) return
    const index = targetBlock?.index ?? targetColumn.blocks.length
    if (active.data.current?.kind === 'palette')
      addBlock(active.data.current.type, targetColumn.id, index)
    else {
      commit(moveBlock(layout, String(active.id), targetColumn.id, index))
      setSelection({ kind: 'block', id: String(active.id) })
    }
  }
  const updateBlock = (block: NonNullable<typeof selectedBlock>['block']) =>
    commit({
      ...layout,
      rows: layout.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) => ({
          ...column,
          blocks: column.blocks.map((item) => (item.id === block.id ? block : item)),
        })),
      })),
    })
  const removeBlockById = (id: string) => {
    commit({
      ...layout,
      rows: layout.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) => ({
          ...column,
          blocks: column.blocks.filter((block) => block.id !== id),
        })),
      })),
    })
    setSelection(null)
  }
  const closeInspector = () => {
    setSelection(null)
    setGlobalOpen(false)
  }
  const inspectorOpen = !preview && (!!selection || globalOpen)

  return (
    <fieldset disabled={disabled} className={`builder-shell ${expanded ? 'builder-expanded' : ''}`}>
      <div className="builder-status">
        <div>
          <strong>Footer Builder</strong>
          <p>Kéo khối vào bố cục, chọn để chỉnh sửa. Mọi thay đổi được xem trước ngay.</p>
        </div>
        <label className="builder-enable">
          <input
            type="checkbox"
            checked={layout.enabled}
            onChange={(event) => commit({ ...layout, enabled: event.target.checked })}
          />
          Dùng bố cục tùy chỉnh
        </label>
      </div>
      {!layout.enabled && (
        <div className="builder-notice">
          Bạn đang thiết kế bản nháp. Bật “Dùng bố cục tùy chỉnh” rồi lưu để áp dụng lên website.
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={({ active }) =>
          setActiveLabel(
            active.data.current?.kind === 'row'
              ? 'Di chuyển hàng'
              : blockLabels[active.data.current?.type as FooterBlockType] ||
                  blockLabels[findBlock(layout, String(active.id))?.block.type || 'text']
          )
        }
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLabel(null)}
      >
        <div className="builder-toolbar">
          <div className="builder-toolbar-group">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Hoàn tác"
              title="Hoàn tác"
              disabled={!history.canUndo || disabled}
              onClick={history.undo}
            >
              <Undo2 size={16} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Làm lại"
              title="Làm lại"
              disabled={!history.canRedo || disabled}
              onClick={history.redo}
            >
              <Redo2 size={16} />
            </Button>
          </div>
          <div className="builder-toolbar-group">
            <div className="builder-segment" role="group" aria-label="Thiết bị xem trước">
              <button
                type="button"
                aria-label="Xem desktop"
                title="Desktop"
                aria-pressed={!mobile}
                onClick={() => setMobile(false)}
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                aria-label="Xem mobile"
                title="Mobile"
                aria-pressed={mobile}
                onClick={() => setMobile(true)}
              >
                <Smartphone size={15} />
              </button>
            </div>
            <div className="builder-segment" role="group" aria-label="Ngôn ngữ xem trước">
              <button type="button" aria-pressed={locale === 'vi'} onClick={() => setLocale('vi')}>
                VI
              </button>
              <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
                EN
              </button>
            </div>
          </div>
          <div className="builder-toolbar-group">
            {!preview && (
              <Button
                type="button"
                size="icon"
                variant={globalOpen && !selection ? 'secondary' : 'ghost'}
                aria-label="Giao diện chung"
                title="Giao diện chung (màu nền, độ rộng…)"
                aria-pressed={globalOpen && !selection}
                onClick={() => {
                  setSelection(null)
                  setGlobalOpen(!(globalOpen && !selection))
                }}
              >
                <Settings2 size={16} />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={preview ? 'secondary' : 'outline'}
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
            >
              <Eye size={15} />
              {preview ? 'Chỉnh sửa' : 'Xem trước'}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={expanded ? 'Thu gọn trình dựng' : 'Mở rộng trình dựng'}
              title={expanded ? 'Thu gọn' : 'Mở rộng'}
              aria-pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </Button>
            {expanded && (
              <Button type="submit" size="sm" disabled={disabled}>
                <Save size={15} />
                Lưu
              </Button>
            )}
          </div>
        </div>
        <div className={`builder-workspace ${inspectorOpen ? '' : 'preview-mode'}`}>
          <div
            className="builder-stage"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeInspector()
            }}
          >
            <div className="builder-stage-label">
              {preview ? 'XEM TRƯỚC' : 'KHUNG SOẠN THẢO'} · {mobile ? 'MOBILE' : 'DESKTOP'}
              <span>{locale.toUpperCase()}</span>
            </div>
            {navigationQuery.isError && (
              <p className="builder-menu-warning">
                Chưa tải được menu footer. Các khối menu đang dùng liên kết dự phòng.
              </p>
            )}
            <BuilderCanvas
              layout={layout}
              selection={selection}
              setSelection={setSelection}
              preview={preview}
              mobile={mobile}
              context={context}
              onAddBlock={(type, columnId) => addBlock(type, columnId)}
              onPatchBlock={(block, values) => updateBlock({ ...block, ...values })}
              onResizeBlock={(block, width) => updateBlock({ ...block, width, height: 0 })}
              onDuplicateBlock={(id) => commit(duplicateBlock(layout, id))}
              onDeleteBlock={removeBlockById}
              onMoveRow={reorderRow}
            />
            {!preview && (
              <button
                className="builder-add-row"
                type="button"
                disabled={layout.rows.length >= 12}
                onClick={addRow}
              >
                <Plus size={16} />
                Thêm hàng
              </button>
            )}
            <p className="builder-hint text-center mt-4">
              {preview
                ? 'Liên kết được vô hiệu hóa trong bản xem trước. Thống kê dùng dữ liệu thật trên website.'
                : 'Bấm vào một khối để chỉnh. Kéo tay nắm để di chuyển; với logo, kéo góc dưới phải để đổi kích thước.'}
            </p>
          </div>
          {inspectorOpen && (
            <aside className="builder-inspector" aria-label="Thuộc tính phần tử">
              {selectedBlock ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="m-3"
                    onClick={closeInspector}
                  >
                    <ArrowLeft size={14} />
                    Đóng
                  </Button>
                  <BlockInspector
                    key={selectedBlock.block.id}
                    block={selectedBlock.block}
                    layout={layout}
                    locale={locale}
                    onChange={updateBlock}
                    onLayoutChange={commit}
                    onUploadStateChange={onUploadStateChange}
                  />
                </>
              ) : selectedRow ? (
                <RowInspector
                  row={selectedRow}
                  onBack={closeInspector}
                  onChange={(row) =>
                    commit({
                      ...layout,
                      rows: layout.rows.map((item) => (item.id === row.id ? row : item)),
                    })
                  }
                  onDelete={() => {
                    commit({
                      ...layout,
                      rows: layout.rows.filter((row) => row.id !== selectedRow.id),
                    })
                    setSelection(null)
                  }}
                />
              ) : (
                <LayoutInspector layout={layout} onChange={commit} />
              )}
            </aside>
          )}
        </div>
        <DragOverlay>
          {activeLabel && <div className="builder-drag-overlay">{activeLabel}</div>}
        </DragOverlay>
      </DndContext>
    </fieldset>
  )
}
