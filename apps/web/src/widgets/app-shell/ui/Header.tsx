/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { cn } from '@/shared/lib'
import { Separator } from '@/shared/ui'
import { SidebarTrigger } from '@/shared/ui'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'z-header h-16',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-full items-center gap-3 p-4 sm:gap-4'
        )}
      >
        <SidebarTrigger variant='outline' className='size-11 lg:size-7' />
        <Separator orientation='vertical' className='h-6' />
        {children}
      </div>
    </header>
  )
}
