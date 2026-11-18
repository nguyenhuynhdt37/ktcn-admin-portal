import { httpClient } from '@/services/http/client'
import type {
  DocumentItem,
  DocumentKind,
  DocumentPagination,
  DocumentPayload,
  UploadedFile,
} from '../types'

export const documentService = {
  list: async (params: {
    kind?: DocumentKind
    search?: string
    page: number
    page_size: number
  }): Promise<DocumentPagination> => {
    const query: Record<string, string | number> = { page: params.page, page_size: params.page_size }
    if (params.kind) query.kind = params.kind
    if (params.search) query.search = params.search
    const response = await httpClient.get<DocumentPagination>('/admin/documents', { params: query })
    return response.data
  },

  create: async (payload: DocumentPayload): Promise<DocumentItem> => {
    const response = await httpClient.post<DocumentItem>('/admin/documents', payload)
    return response.data
  },

  update: async (id: string, payload: DocumentPayload): Promise<DocumentItem> => {
    const response = await httpClient.put<DocumentItem>(`/admin/documents/${id}`, payload)
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/admin/documents/${id}`)
  },

  /** Tải tệp (PDF, Word, Excel, ...) lên kho media; trả về khóa tệp để gắn vào tài liệu. */
  uploadFile: async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<{
      object_key: string
      name: string
      mime_type: string | null
      size: number | null
    }>('/admin/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { object_key, name, mime_type, size } = response.data
    return { object_key, name, mime_type, size }
  },
}
