import { httpClient } from '@/services/http/client'
import type { SiteSettings, UpdateSiteSettingsPayload } from '../types'
import type {
  FooterDynamicData,
  FooterDynamicLink,
  FooterNavigationColumn,
} from '../builder/FooterContent'

interface PreviewMenuNode {
  title: string
  target_type?: string | null
  target_info?: { slug?: string | null } | null
  external_url?: string | null
  has_link: boolean
  open_in_new_tab: boolean
  children?: PreviewMenuNode[]
}

function previewMenuHref(node: PreviewMenuNode) {
  if (!node.has_link) return '#'
  if (node.target_type === 'EXTERNAL_LINK') return node.external_url || '#'
  const slug = node.target_info?.slug
  if (!slug) return '#'
  if (node.target_type === 'CATEGORY') return `/tin-tuc?category_slug=${slug}`
  if (node.target_type === 'ARTICLE' || node.target_type === 'PAGE') return `/tin-tuc/${slug}`
  if (node.target_type === 'DEPARTMENT') return `/bo-mon/${slug}`
  return `/${slug}`
}

interface PortalUnit {
  name: string
  slug: string
  unit_type: string
}

const unitHref = (unit: PortalUnit) =>
  unit.unit_type === 'faculty' ? `/khoa/${unit.slug}` : `/bo-mon/${unit.slug}`

const toLink = (label: string, href: string, extra: Partial<FooterDynamicLink> = {}) => ({
  label_vi: label,
  label_en: label,
  href,
  open_in_new_tab: false,
  ...extra,
})

export const settingService = {
  getFooterNavigation: async (locale: string): Promise<FooterNavigationColumn[]> => {
    const [menu, faculties] = await Promise.all([
      httpClient.get<{ items: PreviewMenuNode[] }>('/portal/menus/footer/tree', {
        params: { lang: locale },
      }),
      httpClient
        .get<PortalUnit[]>('/portal/departments', { params: { unit_type: 'faculty', lang: locale } })
        .then((res) => res.data)
        .catch(() => [] as PortalUnit[]),
    ])
    // Giống website: cột có mục trỏ tới khoa/bộ môn luôn lấy danh sách khoa từ DB.
    return menu.data.items.map((column) => {
      const children = column.children || []
      const hasDepartment = children.some((child) => child.target_type === 'DEPARTMENT')
      const links =
        hasDepartment && faculties.length
          ? [
              ...faculties.map((unit) => toLink(unit.name, `/bo-mon/${unit.slug}`)),
              ...children
                .filter((child) => child.target_type !== 'DEPARTMENT')
                .map((child) =>
                  toLink(child.title, previewMenuHref(child), {
                    open_in_new_tab: child.open_in_new_tab,
                  })
                ),
            ]
          : children.map((child) =>
              toLink(child.title, previewMenuHref(child), {
                open_in_new_tab: child.open_in_new_tab,
              })
            )
      return { title: column.title, links }
    })
  },
  getFooterDynamicData: async (locale: string): Promise<FooterDynamicData> => {
    const params = { lang: locale }
    const [departments, categories, articles] = await Promise.all([
      httpClient.get<PortalUnit[]>('/portal/departments', { params }).then((res) => res.data),
      httpClient
        .get<{ name: string; slug: string }[]>('/portal/categories/tree', { params })
        .then((res) => res.data),
      httpClient
        .get<{ items: { title: string; slug: string }[] }>('/portal/articles', {
          params: { ...params, page: 1, page_size: 20 },
        })
        .then((res) => res.data.items),
    ])
    return {
      departments: departments.map((unit) =>
        toLink(unit.name, unitHref(unit), { unit_type: unit.unit_type })
      ),
      categories: categories.map((item) => toLink(item.name, `/tin-tuc?category_slug=${item.slug}`)),
      latest_articles: articles.map((item) => toLink(item.title, `/tin-tuc/${item.slug}`)),
    }
  },
  getSiteSettings: async (): Promise<SiteSettings> => {
    const response = await httpClient.get<SiteSettings>('/admin/settings')
    return response.data
  },

  updateSiteSettings: async (payload: UpdateSiteSettingsPayload): Promise<SiteSettings> => {
    const response = await httpClient.put<SiteSettings>('/admin/settings', payload)
    return response.data
  },

  uploadImage: async (file: File): Promise<{ object_key: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<{ object_key: string }>(
      '/admin/media/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}
