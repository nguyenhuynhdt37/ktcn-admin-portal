import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, FileText, Loader2, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { documentService } from '../services/documentService'
import {
  DOCUMENT_KIND_LABELS,
  type DocumentItem,
  type DocumentKind,
  type DocumentPayload,
} from '../types'

const PAGE_SIZE = 20

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; detail?: unknown } } })?.response
    ?.data
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.detail === 'string') return data.detail
  return fallback
}

const emptyForm = (kind: DocumentKind): DocumentPayload => ({
  kind,
  title_vi: '',
  title_en: null,
  description: null,
  file_object_key: '',
  file_name: '',
  mime_type: null,
  file_size: null,
  sort_order: 1,
  is_active: true,
})

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [kind, setKind] = useState<DocumentKind | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput.trim(), 400)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DocumentPayload>(emptyForm('VAN_BAN'))
  const [uploading, setUploading] = useState(false)
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null)

  const query = useQuery({
    queryKey: ['admin-documents', kind, search, page],
    queryFn: () =>
      documentService.list({
        kind: kind === 'ALL' ? undefined : kind,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-documents'] })

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId ? documentService.update(editingId, form) : documentService.create(form),
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật tài liệu' : 'Đã thêm tài liệu')
      setFormOpen(false)
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err, 'Không lưu được tài liệu')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa tài liệu')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err, 'Không xóa được tài liệu')),
  })

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm(kind === 'BAI_GIANG' ? 'BAI_GIANG' : 'VAN_BAN'))
    setFormOpen(true)
  }

  const openEdit = (doc: DocumentItem) => {
    setEditingId(doc.id)
    setForm({
      kind: doc.kind,
      title_vi: doc.title_vi,
      title_en: doc.title_en,
      description: doc.description,
      file_object_key: doc.file_object_key,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      sort_order: doc.sort_order,
      is_active: doc.is_active,
    })
    setFormOpen(true)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await documentService.uploadFile(file)
      setForm((prev) => ({
        ...prev,
        file_object_key: uploaded.object_key,
        file_name: uploaded.name || file.name,
        mime_type: uploaded.mime_type ?? file.type ?? null,
        file_size: uploaded.size ?? file.size,
        title_vi: prev.title_vi || (uploaded.name || file.name).replace(/\.[^.]+$/, ''),
      }))
    } catch (err) {
      toast.error(errorMessage(err, 'Tải tệp lên thất bại'))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const canSave = form.title_vi.trim() && form.file_object_key && !uploading && !saveMutation.isPending
  const items = query.data?.items ?? []
  const totalPages = query.data?.total_pages ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" />
            Văn bản & Tài liệu
          </h2>
          <p className="text-sm text-muted-foreground">
            Tải lên văn bản, biểu mẫu, bài giảng, giáo trình để hiển thị và cho người dùng tải về ở
            trang chủ.
          </p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer">
          <Plus className="mr-1 h-4 w-4" />
          Thêm tài liệu
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border bg-muted/60 p-1">
          {(['ALL', 'VAN_BAN', 'BAI_GIANG'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={kind === value ? 'default' : 'ghost'}
              className="h-8 cursor-pointer text-xs"
              onClick={() => {
                setKind(value)
                setPage(1)
              }}
            >
              {value === 'ALL' ? 'Tất cả' : DOCUMENT_KIND_LABELS[value]}
            </Button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tên tài liệu..."
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isError ? (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              Không tải được danh sách tài liệu.
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : query.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Chưa có tài liệu nào. Nhấn &ldquo;Thêm tài liệu&rdquo; để tải lên.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tên tài liệu</th>
                    <th className="px-4 py-3">Nhóm</th>
                    <th className="px-4 py-3">Tệp</th>
                    <th className="px-4 py-3 text-center">Thứ tự</th>
                    <th className="px-4 py-3 text-center">Hiển thị</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{doc.title_vi}</td>
                      <td className="px-4 py-3">{DOCUMENT_KIND_LABELS[doc.kind]}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {doc.file_name}
                        {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                      </td>
                      <td className="px-4 py-3 text-center">{doc.sort_order}</td>
                      <td className="px-4 py-3 text-center">{doc.is_active ? 'Có' : 'Ẩn'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            title="Sửa"
                            onClick={() => openEdit(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10"
                            title="Xóa"
                            onClick={() => setToDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Trước
          </Button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Cập nhật tài liệu' : 'Thêm tài liệu'}</DialogTitle>
            <DialogDescription>
              Tệp được tải lên kho lưu trữ; người dùng tải về từ trang chủ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nhóm tài liệu</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.kind}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, kind: event.target.value as DocumentKind }))
                }
              >
                {(Object.keys(DOCUMENT_KIND_LABELS) as DocumentKind[]).map((value) => (
                  <option key={value} value={value}>
                    {DOCUMENT_KIND_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tệp tài liệu *</label>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.odt,.ods,.csv"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-4 w-4" />
                  )}
                  {form.file_object_key ? 'Chọn tệp khác' : 'Chọn tệp để tải lên'}
                </Button>
                <span className="truncate text-xs text-muted-foreground">
                  {form.file_name
                    ? `${form.file_name}${form.file_size ? ` · ${formatSize(form.file_size)}` : ''}`
                    : 'Chưa chọn tệp'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tên tài liệu (Tiếng Việt) *</label>
              <Input
                value={form.title_vi}
                maxLength={255}
                onChange={(event) => setForm((prev) => ({ ...prev, title_vi: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tên tài liệu (English)</label>
              <Input
                value={form.title_en ?? ''}
                maxLength={255}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title_en: event.target.value || null }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Mô tả ngắn</label>
              <Textarea
                rows={2}
                maxLength={2000}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value || null }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Thứ tự hiển thị</label>
                <Input
                  type="number"
                  min={0}
                  className="w-28"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                />
                Hiển thị trên website
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xác nhận xóa tài liệu"
        description={`Xóa "${toDelete?.title_vi ?? ''}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

export default DocumentsPage
