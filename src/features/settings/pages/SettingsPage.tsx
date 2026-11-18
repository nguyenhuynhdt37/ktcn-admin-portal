import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Link2,
  LayoutGrid,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { getMediaUrl } from '@/features/articles/utils/media'
import { settingService } from '../services/settingService'
import type { SiteSettings, UpdateSiteSettingsPayload } from '../types'
import { FooterBuilderEditor } from '../builder/FooterBuilderEditor'
import { defaultBuilder } from '../builder/model'
import { useBuilderHistory } from '../builder/useBuilderHistory'
import { UnsavedSettingsGuard } from '../components/UnsavedSettingsGuard'
import defaultSiteLogo from '@/assets/site-logo.webp'

const footerLinkSchema = z.object({
  label_vi: z.string().trim().min(1, 'Nhập nhãn tiếng Việt').max(150),
  label_en: z.string().trim().min(1, 'Nhập nhãn tiếng Anh').max(150),
  href: z.string().trim().min(1, 'Nhập đường dẫn').max(500),
  open_in_new_tab: z.boolean(),
})

const homeShortcutSchema = footerLinkSchema.extend({
  icon: z.string().trim().min(1).max(40),
})

const SHORTCUT_ICON_OPTIONS = [
  { value: 'calendar', label: 'Lịch' },
  { value: 'mail', label: 'Thư điện tử' },
  { value: 'file-text', label: 'Văn bản' },
  { value: 'book-open', label: 'Sách / Bài giảng' },
  { value: 'briefcase', label: 'Việc làm' },
  { value: 'message-circle', label: 'Hỏi đáp' },
  { value: 'graduation-cap', label: 'Đào tạo' },
  { value: 'users', label: 'Con người' },
  { value: 'download', label: 'Tải về' },
  { value: 'link', label: 'Liên kết' },
]

const siteSettingsSchema = z.object({
  header_logo_width: z.number().int().min(80).max(600),
  header_logo_height: z.number().int().min(24).max(120),
  header_logo_object_key: z.string().nullable().optional(),
  footer_logo_object_key: z.string().nullable().optional(),
  fanpage_image_object_key: z.string().nullable().optional(),
  logo_alt_vi: z.string().trim().min(1, 'Bắt buộc').max(255),
  logo_alt_en: z.string().trim().min(1, 'Bắt buộc').max(255),
  college_name_vi: z.string().trim().min(1, 'Bắt buộc').max(255),
  college_name_en: z.string().trim().min(1, 'Bắt buộc').max(255),
  address_vi: z.string().trim().min(1, 'Bắt buộc').max(500),
  address_en: z.string().trim().min(1, 'Bắt buộc').max(500),
  phone: z.string().trim().max(100),
  email: z.string().trim().max(255),
  website: z.string().trim().max(255),
  responsible_officer_vi: z.string().trim().max(255),
  responsible_officer_en: z.string().trim().max(255),
  facebook_url: z.string().trim().max(500),
  messenger_url: z.string().trim().max(500),
  copyright_vi: z.string().trim().max(500),
  copyright_en: z.string().trim().max(500),
  developer_name: z.string().trim().max(150),
  developer_url: z.string().trim().max(500),
  quick_links: z.array(footerLinkSchema),
  external_links: z.array(footerLinkSchema),
  home_shortcuts: z.array(homeShortcutSchema).max(12, 'Tối đa 12 lối tắt'),
})

type SettingsFormValues = z.infer<typeof siteSettingsSchema>

interface ImageUploadBoxProps {
  label: string
  description: string
  value: string | null | undefined
  onChange: (key: string | null) => void
  disabled?: boolean
  onUploadStateChange?: (busy: boolean) => void
}

function ImageUploadBox({
  label,
  description,
  value,
  onChange,
  disabled,
  onUploadStateChange,
}: ImageUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const previewUrl = localPreview || (value ? getMediaUrl(value) : '')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      toast.error('Chọn ảnh có dung lượng tối đa 10 MB.')
      e.target.value = ''
      return
    }

    setUploading(true)
    onUploadStateChange?.(true)
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    try {
      const res = await settingService.uploadImage(file)
      onChange(res.object_key)
      toast.success(`Đã tải lên ${label.toLowerCase()}`)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Không thể tải ảnh lên.'
      toast.error(message)
      setLocalPreview(null)
    } finally {
      setUploading(false)
      setLocalPreview(null)
      URL.revokeObjectURL(objectUrl)
      e.target.value = ''
      onUploadStateChange?.(false)
    }
  }

  const handleClear = () => {
    onChange(null)
    setLocalPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2.5 p-4 border rounded-xl bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={uploading || disabled}
            className="h-7 text-[11px] text-destructive hover:bg-destructive/10 px-2 cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Dùng mặc định
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading || disabled}
        className="hidden"
      />

      <button
        type="button"
        aria-label={`Tải lên ${label.toLowerCase()}`}
        disabled={uploading || disabled}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={`relative h-32 w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950 transition-colors ${
          previewUrl ? 'border-border border-solid' : 'border-slate-300 hover:border-primary/50'
        } ${uploading || disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="max-h-24 max-w-[90%] object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-center p-3">
            <Upload className="h-5 w-5 text-primary/70" />
            <span className="text-xs font-medium text-foreground">Nhấn để tải ảnh lên</span>
            <span className="text-[10px]">PNG, JPG, WebP hoặc SVG nền trong suốt</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center gap-2 text-xs font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Đang tải lên...</span>
          </div>
        )}
      </button>
    </div>
  )
}

interface LinkListEditorProps {
  title: string
  description: string
  fieldName: 'quick_links' | 'external_links' | 'home_shortcuts'
  control: ReturnType<typeof useForm<SettingsFormValues>>['control']
}

function LinkListEditor({ title, description, fieldName, control }: LinkListEditorProps) {
  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: fieldName,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const blank = {
              label_vi: '',
              label_en: '',
              href: '',
              open_in_new_tab: fieldName === 'external_links',
            }
            if (fieldName === 'home_shortcuts') {
              ;(append as (value: typeof blank & { icon: string }) => void)({ ...blank, icon: 'link' })
            } else {
              append(blank)
            }
          }}
          className="text-xs h-8 cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Thêm liên kết
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            Chưa có liên kết nào. Nhấn &ldquo;Thêm liên kết&rdquo; để bổ sung.
          </p>
        ) : (
          fields.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start p-3 rounded-lg border bg-muted/15"
            >
              <FormField
                control={control}
                name={`${fieldName}.${index}.label_vi`}
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="text-[11px]">Tên (Tiếng Việt)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Liên hệ"
                        className="h-8 text-xs bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${fieldName}.${index}.label_en`}
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="text-[11px]">Tên (English)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Contact"
                        className="h-8 text-xs bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`${fieldName}.${index}.href`}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel className="text-[11px]">Đường dẫn (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/tu-van-tuyen-sinh hoặc https://..."
                        className="h-8 text-xs font-mono bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              {fieldName === 'home_shortcuts' && (
                <FormField
                  control={control}
                  name={`home_shortcuts.${index}.icon`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-12">
                      <FormLabel className="text-[11px]">Biểu tượng</FormLabel>
                      <FormControl>
                        <select
                          className="h-8 w-full md:w-60 rounded-md border bg-background px-2 text-xs"
                          {...field}
                        >
                          {SHORTCUT_ICON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="md:col-span-2 flex items-center justify-end gap-1 pt-5">
                <FormField
                  control={control}
                  name={`${fieldName}.${index}.open_in_new_tab`}
                  render={({ field }) => (
                    <FormItem
                      className="flex items-center gap-1.5 space-y-0 mr-1"
                      title="Mở tab mới"
                    >
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="scale-75 cursor-pointer"
                        />
                      </FormControl>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        Tab mới
                      </span>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => swap(index, index - 1)}
                  className="h-7 w-7 cursor-pointer"
                  title="Lên"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === fields.length - 1}
                  onClick={() => swap(index, index + 1)}
                  className="h-7 w-7 cursor-pointer"
                  title="Xuống"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Xóa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SettingsFormInner({
  initialData,
  onSave,
  isSaving,
}: {
  initialData: SiteSettings
  onSave: (payload: UpdateSiteSettingsPayload) => void
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState('builder')
  const [initialBuilder] = useState(() => initialData.footer_builder || defaultBuilder())
  const footerHistory = useBuilderHistory(initialBuilder)
  const [uploadingCount, setUploadingCount] = useState(0)
  const onUploadStateChange = (busy: boolean) =>
    setUploadingCount((count) => Math.max(0, count + (busy ? 1 : -1)))

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      header_logo_width: initialData.header_logo_width || 320,
      header_logo_height: initialData.header_logo_height || 56,
      header_logo_object_key: initialData.header_logo_object_key,
      footer_logo_object_key: initialData.footer_logo_object_key,
      fanpage_image_object_key: initialData.fanpage_image_object_key,
      logo_alt_vi: initialData.logo_alt_vi,
      logo_alt_en: initialData.logo_alt_en,
      college_name_vi: initialData.college_name_vi,
      college_name_en: initialData.college_name_en,
      address_vi: initialData.address_vi,
      address_en: initialData.address_en,
      phone: initialData.phone,
      email: initialData.email,
      website: initialData.website,
      responsible_officer_vi: initialData.responsible_officer_vi,
      responsible_officer_en: initialData.responsible_officer_en,
      facebook_url: initialData.facebook_url,
      messenger_url: initialData.messenger_url,
      copyright_vi: initialData.copyright_vi,
      copyright_en: initialData.copyright_en,
      developer_name: initialData.developer_name,
      developer_url: initialData.developer_url,
      quick_links: initialData.quick_links,
      external_links: initialData.external_links,
      home_shortcuts: initialData.home_shortcuts ?? [],
    },
  })

  const headerLogoKey = useWatch({ control: form.control, name: 'header_logo_object_key' })
  const footerLogoKey = useWatch({ control: form.control, name: 'footer_logo_object_key' })
  const fanpageImageKey = useWatch({ control: form.control, name: 'fanpage_image_object_key' })
  const formValues = useWatch({ control: form.control })
  const isDirty =
    form.formState.isDirty || JSON.stringify(initialBuilder) !== JSON.stringify(footerHistory.value)

  useEffect(() => {
    if (!isDirty && !uploadingCount) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [isDirty, uploadingCount])

  const handleSubmit = (values: SettingsFormValues) => {
    onSave({
      ...values,
      footer_builder: footerHistory.value,
      header_logo_object_key: values.header_logo_object_key || null,
      footer_logo_object_key: values.footer_logo_object_key || null,
      fanpage_image_object_key: values.fanpage_image_object_key || null,
    })
  }

  return (
    <Form {...form}>
      <UnsavedSettingsGuard dirty={isDirty || uploadingCount > 0} />
      <form
        onSubmit={form.handleSubmit(handleSubmit, () =>
          toast.error('Kiểm tra các trường bắt buộc ở tab Logo, Liên hệ hoặc Liên kết.')
        )}
        className="space-y-6 mx-auto text-left"
      >
        <fieldset disabled={isSaving || uploadingCount > 0} className="space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary shrink-0" />
                Thiết kế giao diện & Footer
              </h2>
              <p className="text-muted-foreground text-sm">
                Tự xây dựng chân trang bằng kéo thả và tùy chỉnh nhận diện website.
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSaving || uploadingCount > 0}
              className="cursor-pointer shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 self-start sm:self-auto h-9 px-4 text-xs font-semibold"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Đang lưu...' : uploadingCount > 0 ? 'Đang tải ảnh…' : 'Lưu cấu hình'}
            </Button>
          </div>
          <p role="status" className="text-xs text-muted-foreground">
            {isDirty
              ? 'Có thay đổi chưa lưu. Nhấn Lưu cấu hình để áp dụng.'
              : 'Cấu hình đã đồng bộ. Thay đổi chỉ áp dụng sau khi lưu.'}
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex h-auto w-full flex-wrap justify-start bg-muted/60 border p-1 rounded-lg">
              <TabsTrigger value="builder" className="text-xs font-semibold cursor-pointer">
                <LayoutGrid className="h-3.5 w-3.5" />
                Dựng Footer
              </TabsTrigger>
              <TabsTrigger value="branding" className="text-xs font-semibold cursor-pointer">
                <ImageIcon className="h-3.5 w-3.5" />
                Logo & Thương hiệu
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs font-semibold cursor-pointer">
                <Phone className="h-3.5 w-3.5" />
                Thông tin liên hệ
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-xs font-semibold cursor-pointer">
                <Link2 className="h-3.5 w-3.5" />
                Liên kết & Bản quyền
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builder">
              <FooterBuilderEditor
                history={footerHistory}
                settings={{ ...initialData, ...formValues } as SiteSettings}
                disabled={isSaving}
                onUploadStateChange={onUploadStateChange}
              />
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hình ảnh Logo & Fanpage</CardTitle>
                  <CardDescription className="text-xs">
                    Tải lên hình ảnh tùy chỉnh hoặc xóa để quay lại logo mặc định tích hợp sẵn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ImageUploadBox
                    label="Logo chính (Header)"
                    description="Hiển thị trên thanh điều hướng đầu trang."
                    value={headerLogoKey}
                    onChange={(key) =>
                      form.setValue('header_logo_object_key', key, { shouldDirty: true })
                    }
                    onUploadStateChange={onUploadStateChange}
                    disabled={isSaving}
                  />
                  <ImageUploadBox
                    label="Logo chân trang (Footer)"
                    description="Để trống sẽ tự dùng theo Logo chính."
                    value={footerLogoKey}
                    onChange={(key) =>
                      form.setValue('footer_logo_object_key', key, { shouldDirty: true })
                    }
                    onUploadStateChange={onUploadStateChange}
                    disabled={isSaving}
                  />
                  <ImageUploadBox
                    label="Ảnh hộp Facebook Fanpage"
                    description="Để trống sẽ tự dùng theo Logo chân trang."
                    value={fanpageImageKey}
                    onChange={(key) =>
                      form.setValue('fanpage_image_object_key', key, { shouldDirty: true })
                    }
                    onUploadStateChange={onUploadStateChange}
                    disabled={isSaving}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kích thước logo đầu trang</CardTitle>
                  <CardDescription>
                    Logo tự thu nhỏ trên màn hình hẹp để không che menu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {(['header_logo_width', 'header_logo_height'] as const).map((name) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {name === 'header_logo_width' ? 'Chiều rộng' : 'Chiều cao'}:{' '}
                              {field.value}px
                            </FormLabel>
                            <FormControl>
                              <input
                                className="w-full accent-primary"
                                type="range"
                                min={name === 'header_logo_width' ? 80 : 24}
                                max={name === 'header_logo_width' ? 600 : 120}
                                value={field.value}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <div className="overflow-hidden border rounded-md bg-white p-4">
                    <img
                      src={headerLogoKey ? getMediaUrl(headerLogoKey) : defaultSiteLogo}
                      alt={formValues.logo_alt_vi || 'Xem trước logo'}
                      className="max-w-full object-contain object-left"
                      style={{
                        width: formValues.header_logo_width,
                        height: formValues.header_logo_height,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tên trường & Mô tả Logo (Alt Text)</CardTitle>
                  <CardDescription className="text-xs">
                    Thông tin hiển thị ở cột giới thiệu Footer và thuộc tính thay thế cho trình đọc
                    màn hình / SEO.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="college_name_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Tên đơn vị (Tiếng Việt)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="college_name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Tên đơn vị (English)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logo_alt_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Văn bản thay thế Logo (Tiếng Việt)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logo_alt_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Văn bản thay thế Logo (English)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Địa chỉ & Thông tin liên hệ</CardTitle>
                  <CardDescription className="text-xs">
                    Hiển thị trên thanh TopBar, cột Thông tin liên hệ ở Footer và đồng bộ dữ liệu
                    liên hệ cho Trợ lý ảo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Địa chỉ (Tiếng Việt)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Địa chỉ (English)</FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Số điện thoại</FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Email liên hệ</FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Tên miền / Website</FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <div className="hidden md:block" />
                  <FormField
                    control={form.control}
                    name="responsible_officer_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Người chịu trách nhiệm nội dung (Tiếng Việt)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible_officer_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Người chịu trách nhiệm nội dung (English)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facebook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Đường dẫn Facebook Fanpage
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="messenger_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Đường dẫn Messenger (TopBar)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="footer" className="space-y-6">
              <LinkListEditor
                title="Lối tắt trang chủ (thanh biểu tượng)"
                description="Các nút ở thanh biểu tượng dưới phần đầu trang chủ, ví dụ Thư điện tử, Văn bản – Biểu mẫu. Đổi đường dẫn thư điện tử tại đây."
                fieldName="home_shortcuts"
                control={form.control}
              />

              <LinkListEditor
                title="Cột Thông tin / Liên kết nhanh (Quick Links)"
                description="Dùng khi Menu chân trang (footer) trong phần Menu điều hướng chưa có mục cấu hình."
                fieldName="quick_links"
                control={form.control}
              />

              <LinkListEditor
                title="Cột Liên kết ngoài (External Links)"
                description="Danh sách các trang liên kết đối tác/cấp trên ở Footer (khi dùng bố cục dự phòng)."
                fieldName="external_links"
                control={form.control}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thanh bản quyền (Copyright Bar)</CardTitle>
                  <CardDescription className="text-xs">
                    Sử dụng biến <code className="font-mono bg-muted px-1 rounded">{'{year}'}</code>{' '}
                    để tự động chèn năm hiện tại.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="copyright_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Dòng bản quyền (Tiếng Việt)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Ví dụ: © {'{year}'} Bản quyền thuộc về Trường Kỹ thuật và Công nghệ,
                          Trường Đại học Vinh.
                        </FormDescription>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="copyright_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Dòng bản quyền (English)
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="developer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Tên đơn vị phát triển
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="developer_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">
                          Liên kết đơn vị phát triển
                        </FormLabel>
                        <FormControl>
                          <Input className="text-xs h-9 font-mono" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </fieldset>
      </form>
    </Form>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['site-settings'],
    queryFn: settingService.getSiteSettings,
  })

  const saveMutation = useMutation({
    mutationFn: settingService.updateSiteSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['site-settings'], updated)
      toast.success('Đã lưu cấu hình giao diện thành công!')
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: { msg?: string }[] } } })?.response
        ?.data?.detail
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        detail?.[0]?.msg ||
        'Không thể lưu cấu hình. Vui lòng thử lại.'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Đang tải cấu hình giao diện...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 max-w-xl mx-auto mt-10">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-semibold text-base text-destructive">
            Không thể tải cấu hình hệ thống
          </h3>
          <p className="text-muted-foreground text-xs mt-1">
            Vui lòng kiểm tra kết nối đến máy chủ và thử lại.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 cursor-pointer text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <SettingsFormInner
      key={JSON.stringify(data)}
      initialData={data}
      onSave={(payload) => saveMutation.mutate(payload)}
      isSaving={saveMutation.isPending}
    />
  )
}

export default SettingsPage
