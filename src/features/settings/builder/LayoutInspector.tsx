import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import type { FooterBuilder, FooterRow } from '../types'
import { ColorField, Field, NumberField } from './BuilderFields'
import { resizeColumns } from './model'

export function LayoutInspector({
  layout,
  onChange,
}: {
  layout: FooterBuilder
  onChange: (value: FooterBuilder) => void
}) {
  return (
    <div className="builder-inspector-content">
      <h3 className="font-semibold">Giao diện footer</h3>
      <p className="builder-hint">
        Chọn một hàng hoặc khối trên khung soạn thảo để chỉnh chi tiết.
      </p>
      <ColorField
        label="Màu nền footer"
        value={layout.background}
        onChange={(value) => onChange({ ...layout, background: value || '#f8fafc' })}
      />
      <ColorField
        label="Màu chữ mặc định"
        value={layout.color}
        onChange={(value) => onChange({ ...layout, color: value || '#334155' })}
      />
      <ColorField
        label="Màu liên kết"
        value={layout.link_color}
        onChange={(value) => onChange({ ...layout, link_color: value || '#1e40af' })}
      />
      <NumberField
        label="Độ rộng tối đa (px)"
        value={layout.max_width}
        min={320}
        max={1920}
        onChange={(value) => onChange({ ...layout, max_width: value })}
      />
      <NumberField
        label="Khoảng cách giữa khối (px)"
        value={layout.gap}
        max={96}
        onChange={(value) => onChange({ ...layout, gap: value })}
      />
      <label className="builder-check">
        <input
          type="checkbox"
          checked={layout.show_statistics}
          onChange={(event) => onChange({ ...layout, show_statistics: event.target.checked })}
        />
        Hiển thị thống kê truy cập
      </label>
    </div>
  )
}

export function RowInspector({
  row,
  onChange,
  onDelete,
  onBack,
}: {
  row: FooterRow
  onChange: (value: FooterRow) => void
  onDelete: () => void
  onBack: () => void
}) {
  return (
    <div className="builder-inspector-content">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft size={14} />
        Giao diện chung
      </Button>
      <h3 className="font-semibold">Bố cục hàng</h3>
      <Field label="Số cột">
        <select
          value={row.columns.length}
          onChange={(event) => {
            const next = resizeColumns(row, Number(event.target.value))
            if (next === row)
              toast.error('Cột đích vượt quá 30 khối. Hãy di chuyển bớt khối trước.')
            else onChange(next)
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} cột
            </option>
          ))}
        </select>
      </Field>
      <p className="builder-hint">Giảm số cột sẽ chuyển các khối sang cột cuối cùng còn lại.</p>
      {row.columns.map((column, index) => (
        <NumberField
          key={column.id}
          label={`Tỷ lệ cột ${index + 1}`}
          value={column.width}
          min={1}
          max={12}
          onChange={(value) =>
            onChange({
              ...row,
              columns: row.columns.map((item) =>
                item.id === column.id ? { ...item, width: value } : item
              ),
            })
          }
        />
      ))}
      <ColorField
        label="Màu nền hàng"
        value={row.background}
        onChange={(value) => onChange({ ...row, background: value })}
      />
      <ColorField
        label="Màu chữ của hàng"
        value={row.color}
        onChange={(value) => onChange({ ...row, color: value })}
      />
      <NumberField
        label="Khoảng đệm hàng (px)"
        value={row.padding}
        onChange={(value) => onChange({ ...row, padding: value })}
      />
      <NumberField
        label="Khoảng cách cột (px)"
        value={row.gap}
        max={96}
        onChange={(value) => onChange({ ...row, gap: value })}
      />
      <Button type="button" variant="outline" size="sm" onClick={onDelete}>
        <Trash2 size={14} />
        Xóa hàng và các khối
      </Button>
      <p className="builder-hint">Có thể hoàn tác để khôi phục hàng vừa xóa.</p>
    </div>
  )
}
