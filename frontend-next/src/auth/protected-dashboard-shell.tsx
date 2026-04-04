'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'

import { LoadingState } from '@/components/LoadingState'
import { opsApi } from '@/domains/ops/api'
import type { OpsNotificationItem } from '@/domains/types'
import { formatDateTime } from '@/lib/formatters'

import { useSession } from './use-session'

interface ProtectedDashboardShellProps {
  children: React.ReactNode
}

interface NavItem {
  activePrefix: string
  href: string
  label: string
  navIcon: string | React.ReactNode
}

interface UserNotification {
  id: string
  kind: string
  severity: 'info' | 'success' | 'warning' | 'danger'
  title: string
  description: string
  href: string
  createdAtLabel: string
  unread: boolean
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    activePrefix: '/dashboard',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/ios/50/performance-macbook.png'
        alt='performance-macbook'
      />
    )
  },
  {
    label: 'Members',
    href: '/members',
    activePrefix: '/members',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/ios/50/conference-call--v1.png'
        alt='conference-call--v1'
      />
    )
  },
  {
    label: 'Households',
    href: '/households',
    activePrefix: '/households',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/material-outlined/24/cottage.png'
        alt='cottage'
      />
    )
  },
  {
    label: 'Ministries',
    href: '/groups',
    activePrefix: '/groups',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/external-fauzidea-detailed-outline-fauzidea/64/external-government-building-fauzidea-detailed-outline-fauzidea-3.png'
        alt='external-government-building-fauzidea-detailed-outline-fauzidea-3'
      />
    )
  },
  {
    label: 'Events',
    href: '/events',
    activePrefix: '/events',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/external-icongeek26-outline-icongeek26/64/external-events-donation-and-charity-icongeek26-outline-icongeek26.png'
        alt='external-events-donation-and-charity-icongeek26-outline-icongeek26'
      />
    )
  },
  {
    label: 'Attendance',
    href: '/attendance',
    activePrefix: '/attendance',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/parakeet-line/48/checked-user-male.png'
        alt='checked-user-male'
      />
    )
  },
  {
    label: 'Finance',
    href: '/finance',
    activePrefix: '/finance',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/ios/50/sales-performance-balance.png'
        alt='sales-performance-balance'
      />
    )
  },
  {
    label: 'Reports',
    href: '/reports',
    activePrefix: '/reports',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/parakeet-line/48/graph-report.png'
        alt='graph-report'
      />
    )
  },
  {
    label: 'Settings',
    href: '/settings',
    activePrefix: '/settings',
    navIcon: (
      <Image
        width='20'
        height='20'
        src='https://img.icons8.com/puffy/32/settings.png'
        alt='settings'
      />
    )
  }
]

const mobileMediaQuery = '(max-width: 1024px)'
const unreadDotToneClassMap: Record<
  UserNotification['severity'],
  string
> = {
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-[#16335f]',
  success: 'bg-emerald-500'
}

function getDisplayName (
  user: NonNullable<ReturnType<typeof useSession>['user']>
) {
  const fullName = `${user.first_name} ${user.last_name}`.trim()
  return fullName || user.username
}

export function ProtectedDashboardShell ({
  children
}: ProtectedDashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isBootstrapping, status, user, logout } =
    useSession()
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null)

  const notificationsQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: ['ops', 'notifications'],
    queryFn: () => opsApi.getNotifications(),
    staleTime: 60_000
  })

  useEffect(() => {
    if (status !== 'unauthenticated') {
      return
    }

    const query =
      typeof window !== 'undefined'
        ? window.location.search.replace(/^\?/, '')
        : ''
    const nextPath = query ? `${pathname}?${query}` : pathname
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
  }, [pathname, router, status])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const handleChange = () => {
      const isMobile = mediaQuery.matches
      setIsMobileViewport(isMobile)

      if (!isMobile) {
        setIsMobileNavOpen(false)
      }
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen && !isNotificationsMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const pointerTarget = event.target as Node
      const isInsideProfileMenu = profileMenuRef.current?.contains(pointerTarget)
      const isInsideNotificationsMenu =
        notificationsMenuRef.current?.contains(pointerTarget)

      if (!isInsideProfileMenu) {
        setIsProfileMenuOpen(false)
      }
      if (!isInsideNotificationsMenu) {
        setIsNotificationsMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
        setIsNotificationsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsMenuOpen, isProfileMenuOpen])

  if (isBootstrapping) {
    return <LoadingState title='Page Loading. Please wait...' />
  }

  if (!isAuthenticated || !user) {
    return <LoadingState title='Redirecting to sign in...' />
  }

  const displayName = getDisplayName(user)
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(namePart => namePart[0])
    .join('')
    .toUpperCase()
  const hasAuditAccess = Boolean(
    user.is_superuser ||
      user.role_names?.some(
        roleName => roleName === 'Super Admin' || roleName === 'Church Admin'
      )
  )
  const visibleNavItems = hasAuditAccess
    ? [
        ...navItems,
        {
          label: 'Audit',
          href: '/audit',
          activePrefix: '/audit',
          navIcon: (
            <Image
              width='20'
              height='20'
              src='https://img.icons8.com/dotty/80/fine-print.png'
              alt='fine-print'
            />
          )
        }
      ]
    : navItems
  const settingsNavItem =
    visibleNavItems.find(item => item.href === '/settings') ?? null
  const primaryNavItems = visibleNavItems.filter(
    item => item.href !== '/settings'
  )
  const shellClassName = [
    'app-shell',
    isMobileViewport ? 'app-shell-mobile' : '',
    isMobileNavOpen ? 'app-shell-mobile-open' : ''
  ]
    .filter(Boolean)
    .join(' ')

  async function handleLogout () {
    setIsProfileMenuOpen(false)
    setIsNotificationsMenuOpen(false)
    await logout()
    router.replace('/login')
  }

  function toUserNotification (
    notification: OpsNotificationItem
  ): UserNotification {
    const createdAtLabel = notification.created_at
      ? formatDateTime(notification.created_at)
      : 'Just now'
    return {
      id: notification.id,
      kind: notification.kind,
      severity: notification.severity,
      title: notification.title,
      description: notification.description,
      href: notification.href,
      createdAtLabel,
      unread: !readNotificationIds.includes(notification.id)
    }
  }

  const notifications = (
    notificationsQuery.data?.notifications ?? []
  ).map(toUserNotification)

  function handleMarkNotificationRead (notificationId: string) {
    setReadNotificationIds(current =>
      current.includes(notificationId) ? current : [...current, notificationId]
    )
  }

  function handleMarkAllNotificationsRead () {
    const allNotificationIds = notifications.map(notification => notification.id)
    setReadNotificationIds(current =>
      Array.from(new Set([...current, ...allNotificationIds]))
    )
  }

  const unreadNotificationsCount = notifications.filter(
    notification => notification.unread
  ).length

  function renderNavLink (item: NavItem) {
    const isActive =
      item.activePrefix === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.activePrefix)

    const className = isActive
      ? 'app-nav-link app-nav-link-active'
      : 'app-nav-link'

    return (
      <Link
        className={className}
        href={item.href}
        key={item.label}
        onClick={() => {
          if (isMobileViewport) {
            setIsMobileNavOpen(false)
          }
        }}
      >
        <span aria-hidden='true' className='app-nav-icon'>
          {item.navIcon}
        </span>
        <span className='app-nav-label'>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className={shellClassName}>
      {isMobileViewport && isMobileNavOpen ? (
        <button
          aria-label='Close navigation menu'
          className='app-sidebar-backdrop'
          onClick={() => setIsMobileNavOpen(false)}
          type='button'
        />
      ) : // <HamburgerIcon />

      null}

     <aside className='app-sidebar z-20 h-screen'>
        <div className='app-sidebar-brand flex-1 gap-5 items-start'>
          <div className='flex-col'>
            <Image
              width='35'
              height='35'
              src='https://img.icons8.com/external-others-cattaleeya-thongsriphong/64/external-chapel-coronavirus-blue-others-cattaleeya-thongsriphong.png'
              alt='external-chapel-coronavirus-blue-others-cattaleeya-thongsriphong'
            />
          </div>
          <div className='flex'>
            <h3 className='mt-0'>THE HAVEN</h3>
          </div>
        </div>

        <nav className='app-nav' aria-label='Primary'>
          {primaryNavItems.map(renderNavLink)}
        </nav>

        {settingsNavItem ? (
          <div className='border-t border-slate-200/80 pt-3'>
            <nav className='app-nav' aria-label='Settings'>
              {renderNavLink(settingsNavItem)}
            </nav>
          </div>
        ) : null}
      </aside> 

      <header className='bg-white min-h-2.5 fixed w-full z-10'>
        <div className='flex justify-between'>
          <div className='items-center flex-1 ml-96 mt-2.5'>
            <div className='flex items-center border pl-4 gap-2 border-gray-500/30 h-[46px] rounded-full overflow-hidden max-w-md w-full'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='22'
                height='22'
                viewBox='0 0 30 30'
                fill='#6B7280'
              >
                <path d='M13 3C7.489 3 3 7.489 3 13s4.489 10 10 10a9.95 9.95 0 0 0 6.322-2.264l5.971 5.971a1 1 0 1 0 1.414-1.414l-5.97-5.97A9.95 9.95 0 0 0 23 13c0-5.511-4.489-10-10-10m0 2c4.43 0 8 3.57 8 8s-3.57 8-8 8-8-3.57-8-8 3.57-8 8-8' />
              </svg>
              <input
                id='search'
                name='search_box'
                type='text'
                placeholder='Search'
                className='w-full h-full outline-none text-gray-500 bg-transparent placeholder-gray-500 text-sm border-0 focus:ring-0'
              />
            </div>
          </div>
          <div className='flex items-end gap-0.5 ml-1.5'>
            <div className='flex-col m-2.5'>
              <div className='relative' ref={notificationsMenuRef}>
                <button
                  aria-expanded={isNotificationsMenuOpen}
                  aria-haspopup='menu'
                  aria-label='Open notifications'
                  className='relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#16335f]/30'
                  onClick={() => {
                    setIsNotificationsMenuOpen(current => !current)
                    setIsProfileMenuOpen(false)
                  }}
                  type='button'
                >
                  <svg
                    aria-hidden='true'
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    viewBox='0 0 24 24'
                  >
                    <path
                      d='M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  {unreadNotificationsCount > 0 ? (
                    <span className='absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[11px] font-semibold leading-none text-white'>
                      {unreadNotificationsCount > 99
                        ? '99+'
                        : unreadNotificationsCount}
                    </span>
                  ) : null}
                </button>
                {isNotificationsMenuOpen ? (
                  <div className='absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl'>
                    <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3'>
                      <div>
                        <p className='text-sm font-semibold text-gray-900'>
                          Notifications
                        </p>
                        <p className='text-xs text-gray-500'>
                          {unreadNotificationsCount === 0
                            ? 'All caught up'
                            : `${unreadNotificationsCount} unread`}
                        </p>
                      </div>
                      <button
                        className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443]'
                        disabled={unreadNotificationsCount === 0}
                        onClick={handleMarkAllNotificationsRead}
                        type='button'
                      >
                        Mark all as read
                      </button>
                    </div>

                    {notificationsQuery.isLoading ? (
                      <p className='px-4 py-6 text-center text-sm text-gray-500'>
                        Loading reminders...
                      </p>
                    ) : notificationsQuery.error ? (
                      <div className='space-y-2 px-4 py-5'>
                        <p className='text-sm font-medium text-red-700'>
                          Notifications are unavailable right now.
                        </p>
                        <button
                          className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443]'
                          onClick={() => {
                            void notificationsQuery.refetch()
                          }}
                          type='button'
                        >
                          Retry
                        </button>
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className='max-h-80 overflow-y-auto'>
                        {notifications.map(notification => (
                          <div
                            className='border-b border-gray-100 last:border-b-0'
                            key={notification.id}
                          >
                            <Link
                              className='block px-4 py-3 transition hover:bg-gray-50'
                              href={notification.href}
                              onClick={() => {
                                handleMarkNotificationRead(notification.id)
                                setIsNotificationsMenuOpen(false)
                              }}
                            >
                              <div className='flex items-start justify-between gap-3'>
                                <div>
                                  <p className='text-sm font-semibold text-gray-900'>
                                    {notification.title}
                                  </p>
                                  <p className='mt-1 text-xs text-gray-600'>
                                    {notification.description}
                                  </p>
                                </div>
                                <div className='flex flex-col items-end gap-2'>
                                  <span className='text-[11px] text-gray-400'>
                                    {notification.createdAtLabel}
                                  </span>
                                  {notification.unread ? (
                                    <span
                                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                        unreadDotToneClassMap[notification.severity]
                                      }`}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            </Link>
                            {notification.unread ? (
                              <div className='px-4 pb-3'>
                                <button
                                  className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443]'
                                  onClick={() =>
                                    handleMarkNotificationRead(notification.id)
                                  }
                                  type='button'
                                >
                                  Mark as read
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='px-4 py-6 text-center text-sm text-gray-500'>
                        You have no notifications right now.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className='flex-col m-2'>
              <Link
                aria-label='Open help and support'
                className='flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#16335f]/30'
                href='/settings/support'
              >
                <svg
                  aria-hidden='true'
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='1.8'
                  viewBox='0 0 24 24'
                >
                  <circle cx='12' cy='12' r='9' />
                  <path d='M9.4 9.2a2.8 2.8 0 1 1 4.8 2c-.8.7-1.4 1.2-1.4 2.3' />
                  <circle cx='12' cy='16.6' r='.65' fill='currentColor' />
                </svg>
              </Link>
            </div>
            <div className='flex-col m-2'>
              <div className='relative' ref={profileMenuRef}>
                <button
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup='menu'
                  aria-label='Open profile menu'
                  className='flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#16335f]/30'
                  onClick={() => {
                    setIsProfileMenuOpen(current => !current)
                    setIsNotificationsMenuOpen(false)
                  }}
                  type='button'
                >
                  <span className='text-sm font-semibold uppercase'>
                    {initials || 'U'}
                  </span>
                </button>
                {isProfileMenuOpen ? (
                  <div className='absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl'>
                    <div className='border-b border-gray-100 px-4 py-3'>
                      <p className='truncate text-sm font-semibold text-gray-900'>
                        {displayName}
                      </p>
                      <p className='truncate text-xs text-gray-500'>
                        {user.email}
                      </p>
                    </div>
                    <Link
                      className='block px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-gray-900'
                      href='/settings/profile'
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      className='block px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-gray-900'
                      href='/settings/account'
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Manage account
                    </Link>
                    <button
                      className='block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50'
                      onClick={() => {
                        void handleLogout()
                      }}
                      type='button'
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className='app-stage mt-16'>
        <main className='app-main'>{children}</main>
      </div>
    </div>
  )
}
