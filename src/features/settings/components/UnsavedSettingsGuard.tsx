import { useBlocker } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

export function UnsavedSettingsGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname
  )
  return (
    <AlertDialog open={blocker.state === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
          <AlertDialogDescription>
            Lưu cấu hình trước khi rời trang để giữ lại thiết kế của bạn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Ở lại chỉnh sửa
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            Rời trang, bỏ thay đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
