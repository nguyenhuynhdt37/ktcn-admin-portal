import { useRef, useEffect, useState, memo } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { httpClient } from '@/services/http/client'
import { getMediaUrl } from '@/features/articles/utils/media'
import { toast } from 'sonner'
import { validateImageFile } from '@/shared/utils/security'

const TINYMCE_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.1.1/tinymce.min.js'
const TINYMCE_SCRIPT_SRI = 'sha384-NTTCdghHbVcvXVpSNFHK+xc2hj/fkzHEL8Tea31kCQpGtbSMa2A/JWptV2akdED/'

let tinymceScriptPromise: Promise<void> | null = null

function ensureTinyMceLoaded(): Promise<void> {
  if (typeof window !== 'undefined' && 'tinymce' in window && (window as { tinymce?: unknown }).tinymce) {
    return Promise.resolve()
  }
  if (tinymceScriptPromise) {
    return tinymceScriptPromise
  }
  tinymceScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TINYMCE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load TinyMCE')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = TINYMCE_SCRIPT_SRC
    script.integrity = TINYMCE_SCRIPT_SRI
    script.crossOrigin = 'anonymous'
    script.referrerPolicy = 'origin'
    script.onload = () => resolve()
    script.onerror = () => {
      tinymceScriptPromise = null
      reject(new Error('Failed to load TinyMCE'))
    }
    document.head.appendChild(script)
  })
  return tinymceScriptPromise
}

interface TinyMceEditorInstance {
  mode: {
    get: () => string
    set: (mode: string) => void
  }
}

interface CmsEditorProps {
  /** Nội dung HTML */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Chiều cao tối thiểu vùng soạn thảo (px). Mặc định 400 */
  minHeight?: number
  /** Chiều cao tối đa vùng soạn thảo (px), vượt sẽ cuộn. Mặc định 650 */
  maxHeight?: number
}

export const CmsEditor = memo(function CmsEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung...',
  disabled = false,
  minHeight = 250,
  maxHeight = 600,
}: CmsEditorProps) {
  const editorRef = useRef<TinyMceEditorInstance | null>(null)
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && Boolean((window as { tinymce?: unknown }).tinymce)
  )

  useEffect(() => {
    if (scriptReady) return
    let mounted = true
    ensureTinyMceLoaded()
      .then(() => {
        if (mounted) setScriptReady(true)
      })
      .catch((err) => {
        console.error('TinyMCE SRI load error:', err)
      })
    return () => {
      mounted = false
    }
  }, [scriptReady])

  const handleEditorChange = (content: string) => {
    onChange?.(content)
  }

  // Đồng bộ trạng thái disabled trực tiếp vào editor mode để tránh lỗi kẹt readonly khi F5
  useEffect(() => {
    if (editorRef.current) {
      const targetMode = disabled ? 'readonly' : 'design'
      if (editorRef.current.mode.get() !== targetMode) {
        editorRef.current.mode.set(targetMode)
      }
    }
  }, [disabled])

  return (
    <div 
      className="tinymce-editor-wrapper relative w-full border rounded-lg overflow-hidden bg-background"
    >
      <style>{`
        /* Hide TinyMCE notification and branding */
        .tox-notifications-container,
        .tox-statusbar__branding {
          display: none !important;
        }
        .tox-tinymce {
          border: none !important;
        }
      `}</style>
      {scriptReady && (
      <Editor
        tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
        onInit={(_evt, editor) => {
          editorRef.current = editor
          // Thiết lập trạng thái ban đầu chuẩn xác để tránh race condition
          editor.mode.set(disabled ? 'readonly' : 'design')
        }}
        value={value || ''}
        onEditorChange={handleEditorChange}
        init={{
          base_url: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.1.1',
          suffix: '.min',
          resize: false,
          min_height: minHeight,
          max_height: maxHeight,
          menubar: 'file edit view insert format tools table help',
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'autogrow'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic underline strikethrough | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image media table link | code fullscreen',
          content_style: 'body { font-family:system-ui, -apple-system, sans-serif; font-size:15px; color:#1e293b; line-height: 1.6; text-align: justify; } img { max-width: 100% !important; height: auto !important; }',
          placeholder: placeholder || 'Nhập nội dung...',
          branding: false,
          promotion: false,
          // Upload dragged/pasted images directly to MinIO backend
          images_upload_handler: async (blobInfo) => {
            const blob = blobInfo.blob()
            const fileError = validateImageFile(
              { type: blob.type || 'image/png', size: blob.size, name: blobInfo.filename() },
              { maxSizeMb: 10 }
            )
            if (fileError) {
              throw fileError
            }

            try {
              const formData = new FormData()
              formData.append('file', blob, blobInfo.filename())

              const { data } = await httpClient.post<{ object_key: string }>('/admin/media/upload', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              })

              return getMediaUrl(data.object_key)
            } catch (error) {
              console.error('TinyMCE image upload failed:', error)
              throw 'Tải hình ảnh lên thất bại'
            }
          },
          // Upload links/files (PDF, word docs) directly to MinIO backend via link dialog
          file_picker_callback: function (cb, _value, meta) {
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            
            if (meta.filetype === 'image') {
              input.setAttribute('accept', 'image/*')
            } else if (meta.filetype === 'media') {
              input.setAttribute('accept', 'video/*,audio/*')
            } else {
              input.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx')
            }

            input.onchange = async function () {
              const file = (this as HTMLInputElement).files?.[0]
              if (!file) return

              if (meta.filetype === 'image') {
                const fileError = validateImageFile(file, { maxSizeMb: 10 })
                if (fileError) {
                  toast.error(fileError)
                  return
                }
              } else if (file.size > 25 * 1024 * 1024) {
                toast.error('Dung lượng tập tin không được vượt quá 25MB.')
                return
              }

              try {
                const formData = new FormData()
                formData.append('file', file, file.name)

                const { data } = await httpClient.post<{ object_key: string }>('/admin/media/upload', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                })

                const fullUrl = getMediaUrl(data.object_key)
                cb(fullUrl, { title: file.name, text: file.name })
              } catch (error) {
                console.error('TinyMCE file upload failed:', error)
                toast.error('Tải tập tin lên thất bại!')
              }
            }

            input.click()
          }
        }}
      />
      )}
    </div>
  )
})
