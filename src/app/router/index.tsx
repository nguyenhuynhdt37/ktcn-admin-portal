/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Link } from 'react-router'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { isAdminUser, useAuthStore } from '@/stores/authStore'
import { Button } from '@/shared/components/ui/button'

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const UserCreatePage = lazy(() =>
  import('@/features/users/pages/UserCreatePage').then((m) => ({ default: m.UserCreatePage }))
)
const UserEditPage = lazy(() =>
  import('@/features/users/pages/UserEditPage').then((m) => ({ default: m.UserEditPage }))
)
const UserActivityPage = lazy(() => import('@/features/users/pages/UserActivityPage'))
const AuditLogsPage = lazy(() =>
  import('@/features/audit-logs/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
)
const MenusPage = lazy(() =>
  import('@/features/menus/pages/MenusPage').then((m) => ({ default: m.MenusPage }))
)
const LanguagesPage = lazy(() =>
  import('@/features/languages/pages/LanguagesPage').then((m) => ({ default: m.LanguagesPage }))
)
const AIHubPage = lazy(() =>
  import('@/features/ai-hub/pages/AIHubPage').then((m) => ({ default: m.AIHubPage }))
)
const EmbeddingSettingsPage = lazy(() =>
  import('@/features/ai-hub/pages/EmbeddingSettingsPage').then((m) => ({
    default: m.EmbeddingSettingsPage,
  }))
)
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
)
const PositionsPage = lazy(() =>
  import('@/features/positions/pages/PositionsPage').then((m) => ({ default: m.PositionsPage }))
)
const DepartmentsPage = lazy(() =>
  import('@/features/departments/pages/DepartmentsPage').then((m) => ({
    default: m.DepartmentsPage,
  }))
)
const DepartmentCreatePage = lazy(() => import('@/features/departments/pages/DepartmentCreatePage'))
const DepartmentEditPage = lazy(() => import('@/features/departments/pages/DepartmentEditPage'))
const GalleriesPage = lazy(() =>
  import('@/features/galleries/pages/GalleriesPage').then((m) => ({ default: m.GalleriesPage }))
)
const GalleryCreatePage = lazy(() => import('@/features/galleries/pages/GalleryCreatePage'))
const GalleryEditPage = lazy(() => import('@/features/galleries/pages/GalleryEditPage'))
const BannersPage = lazy(() => import('@/features/banners/pages/BannersPage'))
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage'))
const TeachersPage = lazy(() =>
  import('@/features/teachers/pages/TeachersPage').then((m) => ({ default: m.TeachersPage }))
)
const TeacherCreatePage = lazy(() => import('@/features/teachers/pages/TeacherCreatePage'))
const TeacherEditPage = lazy(() => import('@/features/teachers/pages/TeacherEditPage'))
const TeacherDetailPage = lazy(() => import('@/features/teachers/pages/TeacherDetailPage'))
const ProgramsPage = lazy(() =>
  import('@/features/programs/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
)
const ProgramEditPage = lazy(() =>
  import('@/features/programs/pages/ProgramEditPage').then((m) => ({ default: m.ProgramEditPage }))
)
const TagsPage = lazy(() =>
  import('@/features/tags/pages/TagsPage').then((m) => ({ default: m.TagsPage }))
)
const ArticlesPage = lazy(() =>
  import('@/features/articles/pages/ArticlesPage').then((m) => ({ default: m.ArticlesPage }))
)
const ArticleFormPage = lazy(() => import('@/features/articles/pages/ArticleFormPage'))
const ArticleEditPage = lazy(() => import('@/features/articles/pages/ArticleEditPage'))
const ArticleDetailPage = lazy(() => import('@/features/articles/pages/ArticleDetailPage'))
const ArticleDraftsPage = lazy(() =>
  import('@/features/articles/pages/ArticleDraftsPage').then((m) => ({
    default: m.ArticleDraftsPage,
  }))
)
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const ConsultationsPage = lazy(() =>
  import('@/features/consultations/pages/ConsultationsPage').then((m) => ({
    default: m.ConsultationsPage,
  }))
)
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

function withSuspense(node: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      {node}
    </Suspense>
  )
}

function NotFoundPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-extrabold tracking-tight">404</h1>
      <p className="mt-4 text-xl font-medium text-muted-foreground">Không tìm thấy trang yêu cầu</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Đường dẫn bạn truy cập có thể đã thay đổi hoặc không tồn tại.
      </p>
      <Button asChild className="mt-6 cursor-pointer">
        <Link to="/dashboard">Quay lại trang chủ</Link>
      </Button>
    </div>
  )
}

function IndexRedirect() {
  const { user } = useAuthStore()
  return <Navigate to={isAdminUser(user) ? "/dashboard" : "/articles"} replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!isAdminUser(user)) {
    return <Navigate to="/articles" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <PublicRoute>
            {withSuspense(<LoginPage />)}
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <IndexRedirect />,
      },
      {
        path: 'dashboard',
        element: (
          <AdminRoute>
            {withSuspense(<DashboardPage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'categories',
        element: withSuspense(<CategoriesPage />),
      },
      {
        path: 'positions',
        element: withSuspense(<PositionsPage />),
      },
      {
        path: 'departments',
        element: withSuspense(<DepartmentsPage />),
      },
      {
        path: 'departments/create',
        element: withSuspense(<DepartmentCreatePage />),
      },
      {
        path: 'departments/:id/edit',
        element: withSuspense(<DepartmentEditPage />),
      },
      {
        path: 'galleries',
        element: withSuspense(<GalleriesPage />),
      },
      {
        path: 'galleries/create',
        element: withSuspense(<GalleryCreatePage />),
      },
      {
        path: 'galleries/:id/edit',
        element: withSuspense(<GalleryEditPage />),
      },
      {
        path: 'tags',
        element: withSuspense(<TagsPage />),
      },
      {
        path: 'banners',
        element: withSuspense(<BannersPage />),
      },
      {
        path: 'documents',
        element: withSuspense(<DocumentsPage />),
      },
      {
        path: 'teachers',
        element: withSuspense(<TeachersPage />),
      },
      {
        path: 'teachers/create',
        element: withSuspense(<TeacherCreatePage />),
      },
      {
        path: 'teachers/:id/edit',
        element: withSuspense(<TeacherEditPage />),
      },
      {
        path: 'teachers/:slug',
        element: withSuspense(<TeacherDetailPage />),
      },
      {
        path: 'programs',
        element: withSuspense(<ProgramsPage />),
      },
      {
        path: 'programs/:id/edit',
        element: withSuspense(<ProgramEditPage />),
      },
      {
        path: 'articles',
        element: withSuspense(<ArticlesPage />),
      },
      {
        path: 'articles/create',
        element: withSuspense(<ArticleFormPage />),
      },
      {
        path: 'articles/:id/edit',
        element: withSuspense(<ArticleEditPage />),
      },
      {
        path: 'articles/:id/preview',
        element: withSuspense(<ArticleDetailPage />),
      },
      {
        path: 'articles/drafts',
        element: withSuspense(<ArticleDraftsPage />),
      },
      {
        path: 'consultations',
        element: withSuspense(<ConsultationsPage />),
      },
      {
        path: 'users',
        element: (
          <AdminRoute>
            {withSuspense(<UsersPage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'users/create',
        element: (
          <AdminRoute>
            {withSuspense(<UserCreatePage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'users/:id/edit',
        element: (
          <AdminRoute>
            {withSuspense(<UserEditPage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'users/:id/activity',
        element: (
          <AdminRoute>
            {withSuspense(<UserActivityPage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <AdminRoute>
            {withSuspense(<AuditLogsPage />)}
          </AdminRoute>
        ),
      },
      {
        path: 'menus',
        element: withSuspense(<MenusPage />),
      },
      {
        path: 'languages',
        element: withSuspense(<LanguagesPage />),
      },
      {
        path: 'languages/ai-hub',
        element: withSuspense(<AIHubPage />),
      },
      {
        path: 'languages/embedding',
        element: withSuspense(<EmbeddingSettingsPage />),
      },
      {
        path: 'profile',
        element: withSuspense(<ProfilePage />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsPage />),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
