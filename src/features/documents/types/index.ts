export type DocumentKind = 'VAN_BAN' | 'BAI_GIANG'

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  VAN_BAN: 'Văn bản – Biểu mẫu',
  BAI_GIANG: 'Bài giảng – Giáo trình',
}

export interface DocumentItem {
  id: string
  kind: DocumentKind
  title_vi: string
  title_en: string | null
  description: string | null
  file_object_key: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentPayload {
  kind: DocumentKind
  title_vi: string
  title_en: string | null
  description: string | null
  file_object_key: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  sort_order: number
  is_active: boolean
}

export interface DocumentPagination {
  items: DocumentItem[]
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface UploadedFile {
  object_key: string
  name: string
  mime_type: string | null
  size: number | null
}
