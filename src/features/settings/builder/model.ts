import type {
  FooterBlock,
  FooterBlockType,
  FooterBuilder,
  FooterRow,
} from '../types/footer-builder'

export const blockLabels: Record<FooterBlockType, string> = {
  logo: 'Logo',
  heading: 'Tiêu đề',
  text: 'Văn bản',
  links: 'Danh sách liên kết',
  contact: 'Thông tin liên hệ',
  social: 'Mạng xã hội',
  image: 'Hình ảnh',
  button: 'Nút liên kết',
  divider: 'Đường phân cách',
  spacer: 'Khoảng trống',
  copyright: 'Bản quyền',
}

export const newId = () => crypto.randomUUID()

export function createBlock(type: FooterBlockType): FooterBlock {
  return {
    id: newId(),
    type,
    title_vi: type === 'heading' ? 'Tiêu đề mới' : type === 'button' ? 'Tìm hiểu thêm' : '',
    title_en: type === 'heading' ? 'New heading' : type === 'button' ? 'Learn more' : '',
    text_vi: type === 'text' ? 'Nhập nội dung của bạn tại đây.' : '',
    text_en: type === 'text' ? 'Add your content here.' : '',
    href: '',
    open_in_new_tab: false,
    image_object_key: null,
    image_alt_vi: '',
    image_alt_en: '',
    source: 'custom',
    unit_type: 'faculty',
    item_limit: 8,
    menu_index: 0,
    links: [],
    align: 'left',
    color: null,
    background: null,
    font_size: type === 'heading' ? 18 : 14,
    padding: 0,
    width: 224,
    height: type === 'spacer' ? 24 : 56,
    hidden_desktop: false,
    hidden_mobile: false,
  }
}

export function createRow(count = 1): FooterRow {
  return {
    id: newId(),
    background: null,
    color: null,
    padding: 32,
    gap: 24,
    columns: Array.from({ length: count }, () => ({ id: newId(), width: 1, blocks: [] })),
  }
}

export function defaultBuilder(): FooterBuilder {
  const main = createRow(4)
  main.columns[0].width = 2
  main.columns[0].blocks = [createBlock('logo'), createBlock('contact')]
  main.columns[1].blocks = [
    {
      ...createBlock('links'),
      source: 'navigation',
      menu_index: 0,
      title_vi: 'Thông tin',
      title_en: 'Information',
    },
  ]
  main.columns[2].blocks = [
    {
      ...createBlock('links'),
      source: 'navigation',
      menu_index: 1,
      title_vi: 'Liên kết ngoài',
      title_en: 'External links',
    },
  ]
  main.columns[3].blocks = [
    { ...createBlock('image'), href: '', title_vi: 'Fanpage', title_en: 'Fanpage' },
    createBlock('social'),
  ]
  const bottom = createRow()
  bottom.background = '#7f1d1d'
  bottom.color = '#ffffff'
  bottom.padding = 20
  bottom.columns[0].blocks = [{ ...createBlock('copyright'), align: 'center' }]
  return {
    version: 1,
    enabled: false,
    background: '#f8fafc',
    color: '#334155',
    link_color: '#1e40af',
    max_width: 1280,
    gap: 20,
    show_statistics: true,
    rows: [main, bottom],
  }
}

export function findBlock(layout: FooterBuilder, id: string) {
  for (const row of layout.rows) {
    for (const column of row.columns) {
      const index = column.blocks.findIndex((block) => block.id === id)
      if (index !== -1) return { row, column, index, block: column.blocks[index] }
    }
  }
  return undefined
}

export function moveBlock(
  layout: FooterBuilder,
  id: string,
  columnId: string,
  index: number
): FooterBuilder {
  const copy = structuredClone(layout)
  const source = findBlock(copy, id)
  const target = copy.rows.flatMap((row) => row.columns).find((column) => column.id === columnId)
  if (!source || !target || (target.id !== source.column.id && target.blocks.length >= 30))
    return layout
  source.column.blocks.splice(source.index, 1)
  target.blocks.splice(Math.max(0, Math.min(index, target.blocks.length)), 0, source.block)
  return copy
}

export function duplicateBlock(layout: FooterBuilder, id: string): FooterBuilder {
  const copy = structuredClone(layout)
  const found = findBlock(copy, id)
  if (!found || found.column.blocks.length >= 30) return layout
  found.column.blocks.splice(found.index + 1, 0, { ...structuredClone(found.block), id: newId() })
  return copy
}

export function resizeColumns(row: FooterRow, count: number): FooterRow {
  const copy = structuredClone(row)
  const size = Math.max(1, Math.min(6, count))
  if (size < copy.columns.length) {
    const overflow = copy.columns.slice(size).flatMap((column) => column.blocks)
    if (copy.columns[size - 1].blocks.length + overflow.length > 30) return row
    copy.columns[size - 1].blocks.push(...overflow)
    copy.columns = copy.columns.slice(0, size)
  }
  while (copy.columns.length < size) copy.columns.push({ id: newId(), width: 1, blocks: [] })
  return copy
}
