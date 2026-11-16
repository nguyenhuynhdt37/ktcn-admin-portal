import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import { getMediaUrl } from '@/features/articles/utils/media'
import { Button } from '@/shared/components/ui/button'
import type { FooterBlock, FooterBuilder } from '../types'
import { settingService } from '../services/settingService'
import { blockLabels, findBlock, moveBlock } from './model'
import { ColorField, Field, NumberField, TextField } from './BuilderFields'

export function BlockInspector({
  block,
  layout,
  locale,
  onChange,
  onLayoutChange,
  onUploadStateChange,
}: {
  block: FooterBlock
  layout: FooterBuilder
  locale: 'vi' | 'en'
  onChange: (block: FooterBlock) => void
  onLayoutChange: (layout: FooterBuilder) => void
  onUploadStateChange: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const patch = (values: Partial<FooterBlock>) => onChange({ ...block, ...values })
  const language = locale === 'vi' ? 'Tiếng Việt' : 'English'
  const found = findBlock(layout, block.id)!
  const isImage = block.type === 'logo' || block.type === 'image'
  const isLinks = block.type === 'links' || block.type === 'social'
  const upload = async (file?: File) => {
    if (!file) return
    if (!/^image\//.test(file.type) || file.size > 10 * 1024 * 1024) {
      toast.error('Chọn ảnh có dung lượng tối đa 10 MB.')
      return
    }
    setUploading(true)
    onUploadStateChange(true)
    try {
      const result = await settingService.uploadImage(file)
      patch({ image_object_key: result.object_key })
      toast.success('Đã tải ảnh lên')
    } catch {
      toast.error('Không thể tải ảnh. Vui lòng thử lại.')
    } finally {
      setUploading(false)
      onUploadStateChange(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="builder-inspector-content">
      <h3 className="font-semibold">{blockLabels[block.type]}</h3>
      <p className="text-xs text-muted-foreground">Nội dung · {language}</p>
      {!['divider', 'spacer', 'copyright'].includes(block.type) && (
        <TextField
          label={`Tiêu đề (${language})`}
          value={block[`title_${locale}`]}
          onChange={(value) => patch({ [`title_${locale}`]: value })}
        />
      )}
      {['text', 'copyright'].includes(block.type) && (
        <TextField
          label={`Nội dung (${language})`}
          value={block[`text_${locale}`]}
          onChange={(value) => patch({ [`text_${locale}`]: value })}
          multiline
          maxLength={5000}
        />
      )}
      {block.type === 'copyright' && (
        <p className="builder-hint">
          Để trống để dùng nội dung bản quyền chung. Dùng {'{year}'} cho năm hiện tại.
        </p>
      )}
      {block.type === 'contact' && (
        <p className="builder-hint">
          Dùng dữ liệu ở tab Thông tin liên hệ. Tên đơn vị được chỉnh trong Logo & Thương hiệu.
        </p>
      )}
      {isImage && (
        <>
          <div className="builder-image-pick">
            {block.image_object_key ? (
              <img src={getMediaUrl(block.image_object_key)} alt="" />
            ) : (
              <span>Đang dùng ảnh mặc định</span>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              <Upload size={14} />
              {uploading ? 'Đang tải…' : 'Đổi ảnh'}
            </Button>
            {block.image_object_key && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => patch({ image_object_key: null })}
              >
                Dùng mặc định
              </Button>
            )}
          </div>
          <NumberField
            label="Kích thước (px)"
            value={block.width}
            min={32}
            max={1200}
            onChange={(value) => patch({ width: value, height: 0 })}
          />
        </>
      )}
      {block.type === 'button' && (
        <>
          <TextField
            label="Đường dẫn khi nhấn"
            value={block.href}
            onChange={(value) => patch({ href: value })}
            maxLength={500}
          />
          <label className="builder-check">
            <input
              type="checkbox"
              checked={block.open_in_new_tab}
              onChange={(event) => patch({ open_in_new_tab: event.target.checked })}
            />
            Mở trong tab mới
          </label>
        </>
      )}
      {block.type === 'spacer' && (
        <NumberField
          label="Chiều cao (px)"
          value={block.height}
          max={600}
          onChange={(value) => patch({ height: value })}
        />
      )}
      {block.type === 'links' && (
        <Field label="Nguồn liên kết">
          <select
            value={block.source}
            onChange={(event) => patch({ source: event.target.value as FooterBlock['source'] })}
          >
            <option value="custom">Tự tạo danh sách</option>
            <option value="navigation">Menu điều hướng footer</option>
            <option value="quick_links">Liên kết nhanh chung</option>
            <option value="external_links">Liên kết ngoài chung</option>
            <option value="departments">Tự động: Khoa / bộ môn (từ CSDL)</option>
            <option value="categories">Tự động: Danh mục tin tức (từ CSDL)</option>
            <option value="latest_articles">Tự động: Bài viết mới nhất (từ CSDL)</option>
          </select>
        </Field>
      )}
      {block.type === 'links' && block.source === 'departments' && (
        <Field label="Loại đơn vị">
          <select
            value={block.unit_type}
            onChange={(event) => patch({ unit_type: event.target.value as FooterBlock['unit_type'] })}
          >
            <option value="faculty">Khoa</option>
            <option value="department">Bộ môn</option>
            <option value="office">Phòng / ban</option>
            <option value="center">Trung tâm</option>
            <option value="lab">Phòng thí nghiệm</option>
          </select>
        </Field>
      )}
      {block.type === 'links' &&
        ['departments', 'categories', 'latest_articles'].includes(block.source) && (
          <>
            <NumberField
              label="Hiển thị tối đa"
              value={block.item_limit}
              min={1}
              max={20}
              onChange={(value) => patch({ item_limit: value })}
            />
            <p className="builder-hint">
              Danh sách tự cập nhật theo dữ liệu trong hệ thống, không cần chỉnh tay.
            </p>
          </>
        )}
      {block.type === 'links' && block.source === 'navigation' && (
        <Field label="Cột menu">
          <select
            value={block.menu_index}
            onChange={(event) => patch({ menu_index: Number(event.target.value) })}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <option key={index} value={index}>
                Cột {index + 1}
              </option>
            ))}
          </select>
        </Field>
      )}
      {isLinks && (block.type === 'social' || block.source === 'custom') && (
        <div className="space-y-3">
          {block.links.map((link, index) => (
            <div className="builder-link-edit" key={index}>
              <TextField
                label={`Tên liên kết ${index + 1} (${language})`}
                value={link[`label_${locale}`]}
                maxLength={150}
                onChange={(value) =>
                  patch({
                    links: block.links.map((item, i) =>
                      i === index ? { ...item, [`label_${locale}`]: value } : item
                    ),
                  })
                }
              />
              <TextField
                label={`URL liên kết ${index + 1}`}
                value={link.href}
                maxLength={500}
                onChange={(value) =>
                  patch({
                    links: block.links.map((item, i) =>
                      i === index ? { ...item, href: value } : item
                    ),
                  })
                }
              />
              <div className="flex items-center justify-between">
                <label className="builder-check">
                  <input
                    type="checkbox"
                    checked={link.open_in_new_tab}
                    onChange={(event) =>
                      patch({
                        links: block.links.map((item, i) =>
                          i === index ? { ...item, open_in_new_tab: event.target.checked } : item
                        ),
                      })
                    }
                  />
                  Tab mới
                </label>
                <button
                  type="button"
                  aria-label={`Xóa liên kết ${index + 1}`}
                  onClick={() => patch({ links: block.links.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={block.links.length >= 50}
            onClick={() =>
              patch({
                links: [
                  ...block.links,
                  {
                    label_vi: 'Liên kết mới',
                    label_en: 'New link',
                    href: '/',
                    open_in_new_tab: false,
                  },
                ],
              })
            }
          >
            Thêm liên kết
          </Button>
          {block.type === 'social' && (
            <p className="builder-hint">
              Danh sách trống sẽ dùng Facebook và Messenger trong thông tin chung.
            </p>
          )}
        </div>
      )}
      <details className="builder-advanced">
        <summary>Nâng cao</summary>
        <div className="builder-advanced-body">
          {isImage && (
            <>
              <TextField
                label={`Mô tả ảnh (${language})`}
                value={block[`image_alt_${locale}`]}
                onChange={(value) => patch({ [`image_alt_${locale}`]: value })}
              />
              <TextField
                label="Đường dẫn khi nhấn"
                value={block.href}
                onChange={(value) => patch({ href: value })}
                maxLength={500}
              />
              <label className="builder-check">
                <input
                  type="checkbox"
                  checked={block.open_in_new_tab}
                  onChange={(event) => patch({ open_in_new_tab: event.target.checked })}
                />
                Mở trong tab mới
              </label>
              <TextField
                label="Mã ảnh / đường dẫn ảnh"
                value={block.image_object_key || ''}
                onChange={(value) => patch({ image_object_key: value || null })}
                maxLength={512}
              />
              <NumberField
                label="Chiều cao (px, 0 = tự động)"
                value={block.height}
                max={600}
                onChange={(value) => patch({ height: value })}
              />
            </>
          )}
      <Field label="Căn nội dung">
        <select
          value={block.align}
          onChange={(event) => patch({ align: event.target.value as FooterBlock['align'] })}
        >
          <option value="left">Trái</option>
          <option value="center">Giữa</option>
          <option value="right">Phải</option>
        </select>
      </Field>
      <ColorField
        label="Màu chữ"
        value={block.color}
        onChange={(value) => patch({ color: value })}
      />
      <ColorField
        label="Màu nền khối"
        value={block.background}
        onChange={(value) => patch({ background: value })}
      />
      <NumberField
        label="Cỡ chữ (px)"
        value={block.font_size}
        min={8}
        max={96}
        onChange={(value) => patch({ font_size: value })}
      />
      <NumberField
        label="Khoảng đệm (px)"
        value={block.padding}
        onChange={(value) => patch({ padding: value })}
      />
      <label className="builder-check">
        <input
          type="checkbox"
          checked={block.hidden_desktop}
          onChange={(event) => patch({ hidden_desktop: event.target.checked })}
        />
        Ẩn trên desktop
      </label>
      <label className="builder-check">
        <input
          type="checkbox"
          checked={block.hidden_mobile}
          onChange={(event) => patch({ hidden_mobile: event.target.checked })}
        />
        Ẩn trên mobile
      </label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={found.index === 0}
              onClick={() =>
                onLayoutChange(moveBlock(layout, block.id, found.column.id, found.index - 1))
              }
            >
              Lên
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={found.index === found.column.blocks.length - 1}
              onClick={() =>
                onLayoutChange(moveBlock(layout, block.id, found.column.id, found.index + 1))
              }
            >
              Xuống
            </Button>
          </div>
      <Field label="Chuyển đến cột">
        <select
          value={found.column.id}
          onChange={(event) => onLayoutChange(moveBlock(layout, block.id, event.target.value, 30))}
        >
          {layout.rows.flatMap((row, ri) =>
            row.columns.map((column, ci) => (
              <option value={column.id} key={column.id}>
                Hàng {ri + 1} · Cột {ci + 1}
              </option>
            ))
          )}
        </select>
      </Field>
        </div>
      </details>
    </div>
  )
}
