'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'

import { LoadingState } from '@/components/LoadingState'
import { attendanceApi } from '@/domains/attendance/api'
import { financeApi } from '@/domains/finance/api'
import { groupsApi } from '@/domains/groups/api'
import { householdsApi } from '@/domains/households/api'
import { membersApi } from '@/domains/members/api'
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

interface GlobalSearchItem {
  description: string
  href: string
  id: string
  title: string
}

interface GlobalSearchSection {
  items: GlobalSearchItem[]
  title: string
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

const globalQuickActions: GlobalSearchItem[] = [
  {
    id: 'quick-action-record-attendance',
    title: 'Record attendance',
    description: 'Continue attendance capture workflows',
    href: '/attendance'
  },
  {
    id: 'quick-action-add-event',
    title: 'Add event',
    description: 'Create or update service events',
    href: '/events'
  },
  {
    id: 'quick-action-add-member',
    title: 'Add member',
    description: 'Open member directory and create records',
    href: '/members'
  },
  {
    id: 'quick-action-finance-entry',
    title: 'Record finance entry',
    description: 'Post income or expense transactions',
    href: '/finance'
  },
  {
    id: 'quick-action-reports',
    title: 'Open reports',
    description: 'Review operational reporting summaries',
    href: '/reports'
  },
  {
    id: 'quick-action-support',
    title: 'Open help & support',
    description: 'Access support pathways and account guidance',
    href: '/settings/support'
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

function includesSearch (
  query: string,
  ...values: Array<string | null | undefined>
) {
  if (!query) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  return values.some(value =>
    (value ?? '')
      .toLowerCase()
      .includes(normalizedQuery)
  )
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchItemIndex, setActiveSearchItemIndex] = useState(0)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearchTerm = useDeferredValue(searchTerm.trim())

  const notificationsQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: ['ops', 'notifications'],
    queryFn: () => opsApi.getNotifications(),
    staleTime: 60_000
  })

  const globalSearchQuery = useQuery({
    enabled: isAuthenticated && isSearchOpen && deferredSearchTerm.length >= 2,
    queryKey: ['global-search', deferredSearchTerm],
    queryFn: async () => {
      const [
        membersResult,
        householdsResult,
        groupsResult,
        serviceEventsResult,
        transactionsResult
      ] = await Promise.allSettled([
        membersApi.listMembersPage({ search: deferredSearchTerm, page_size: 4 }),
        householdsApi.listHouseholdsPage({
          search: deferredSearchTerm,
          page_size: 4
        }),
        groupsApi.listGroupsPage({ search: deferredSearchTerm, page_size: 4 }),
        attendanceApi.listServiceEventsPage({
          search: deferredSearchTerm,
          page_size: 4
        }),
        financeApi.listTransactionsPage({
          search: deferredSearchTerm,
          page_size: 4
        })
      ])

      return {
        members:
          membersResult.status === 'fulfilled' ? membersResult.value.items : [],
        households:
          householdsResult.status === 'fulfilled'
            ? householdsResult.value.items
            : [],
        groups:
          groupsResult.status === 'fulfilled' ? groupsResult.value.items : [],
        serviceEvents:
          serviceEventsResult.status === 'fulfilled'
            ? serviceEventsResult.value.items
            : [],
        transactions:
          transactionsResult.status === 'fulfilled'
            ? transactionsResult.value.items
            : []
      }
    },
    staleTime: 30_000
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
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      const activeTagName = activeElement?.tagName
      const isTypingElement =
        activeTagName === 'INPUT' ||
        activeTagName === 'TEXTAREA' ||
        (activeElement as HTMLElement | null)?.isContentEditable

      const isSearchShortcut =
        (event.key.toLowerCase() === 'k' &&
          (event.ctrlKey || event.metaKey)) ||
        (event.key === '/' && !isTypingElement)

      if (!isSearchShortcut) {
        return
      }

      event.preventDefault()
      setIsSearchOpen(true)
      setIsProfileMenuOpen(false)
      setIsNotificationsMenuOpen(false)
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      })
    }

    document.addEventListener('keydown', handleGlobalSearchShortcut)
    return () => {
      document.removeEventListener('keydown', handleGlobalSearchShortcut)
    }
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen && !isNotificationsMenuOpen && !isSearchOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const pointerTarget = event.target as Node
      const isInsideProfileMenu = profileMenuRef.current?.contains(pointerTarget)
      const isInsideNotificationsMenu =
        notificationsMenuRef.current?.contains(pointerTarget)
      const isInsideSearch = searchContainerRef.current?.contains(pointerTarget)

      if (!isInsideProfileMenu) {
        setIsProfileMenuOpen(false)
      }
      if (!isInsideNotificationsMenu) {
        setIsNotificationsMenuOpen(false)
      }
      if (!isInsideSearch) {
        setIsSearchOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
        setIsNotificationsMenuOpen(false)
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsMenuOpen, isProfileMenuOpen, isSearchOpen])

  const displayName = user ? getDisplayName(user) : 'User'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(namePart => namePart[0])
    .join('')
    .toUpperCase()
  const hasAuditAccess = Boolean(
    user?.is_superuser ||
      user?.role_names?.some(
        roleName => roleName === 'Super Admin' || roleName === 'Church Admin'
      )
  )
  const visibleNavItems = useMemo(
    () =>
      hasAuditAccess
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
        : navItems,
    [hasAuditAccess]
  )
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

  const navigationSearchItems = useMemo<GlobalSearchItem[]>(
    () =>
      visibleNavItems.map(item => ({
        id: `nav-${item.href}`,
        title: item.label,
        description: `Open ${item.label.toLowerCase()} page`,
        href: item.href
      })),
    [visibleNavItems]
  )

  const quickActionItems = useMemo<GlobalSearchItem[]>(
    () =>
      hasAuditAccess
        ? [
            ...globalQuickActions,
            {
              id: 'quick-action-audit',
              title: 'Open audit timeline',
              description: 'Review operational and admin activity logs',
              href: '/audit'
            }
          ]
        : globalQuickActions,
    [hasAuditAccess]
  )

  const normalizedSearchTerm = deferredSearchTerm.toLowerCase()
  const shouldFetchGlobalRecords = normalizedSearchTerm.length >= 2

  const searchSections = useMemo<GlobalSearchSection[]>(() => {
    const sections: GlobalSearchSection[] = []

    const filteredQuickActions = quickActionItems.filter(item =>
      includesSearch(
        normalizedSearchTerm,
        item.title,
        item.description,
        item.href
      )
    )
    const filteredNavigation = navigationSearchItems.filter(item =>
      includesSearch(
        normalizedSearchTerm,
        item.title,
        item.description,
        item.href
      )
    )

    if (!normalizedSearchTerm) {
      sections.push({
        title: 'Quick actions',
        items: filteredQuickActions.slice(0, 6)
      })
      sections.push({
        title: 'Navigation',
        items: filteredNavigation.slice(0, 8)
      })
      return sections
    }

    if (filteredQuickActions.length > 0) {
      sections.push({
        title: 'Quick actions',
        items: filteredQuickActions.slice(0, 6)
      })
    }

    if (filteredNavigation.length > 0) {
      sections.push({
        title: 'Navigation',
        items: filteredNavigation.slice(0, 8)
      })
    }

    if (!shouldFetchGlobalRecords) {
      return sections
    }

    const members = (globalSearchQuery.data?.members ?? []).map(member => ({
      id: `member-${member.id}`,
      title: member.full_name,
      description: member.email || member.phone_number || '@member profile',
      href: `/members/${member.id}`
    }))
    const households = (globalSearchQuery.data?.households ?? []).map(
      household => ({
        id: `household-${household.id}`,
        title: household.name,
        description: household.city || household.primary_phone || 'Household',
        href: `/households/${household.id}`
      })
    )
    const groups = (globalSearchQuery.data?.groups ?? []).map(group => ({
      id: `group-${group.id}`,
      title: group.name,
      description:
        group.description ||
        `${group.active_member_count} active member${
          group.active_member_count === 1 ? '' : 's'
        }`,
      href: `/groups/${group.id}`
    }))
    const serviceEvents = (globalSearchQuery.data?.serviceEvents ?? []).map(
      serviceEvent => ({
        id: `event-${serviceEvent.id}`,
        title: serviceEvent.title,
        description: `${serviceEvent.service_date} | ${serviceEvent.location || 'No location set'}`,
        href: `/events/${serviceEvent.id}`
      })
    )
    const transactions = (globalSearchQuery.data?.transactions ?? []).map(
      transaction => ({
        id: `transaction-${transaction.id}`,
        title: transaction.reference_no,
        description:
          transaction.description ||
          transaction.service_event_title ||
          transaction.transaction_type,
        href: `/finance/transactions/${transaction.id}`
      })
    )

    if (members.length > 0) {
      sections.push({ title: 'Members', items: members })
    }
    if (households.length > 0) {
      sections.push({ title: 'Households', items: households })
    }
    if (groups.length > 0) {
      sections.push({ title: 'Groups', items: groups })
    }
    if (serviceEvents.length > 0) {
      sections.push({ title: 'Events', items: serviceEvents })
    }
    if (transactions.length > 0) {
      sections.push({ title: 'Transactions', items: transactions })
    }

    return sections
  }, [
    globalSearchQuery.data?.groups,
    globalSearchQuery.data?.households,
    globalSearchQuery.data?.members,
    globalSearchQuery.data?.serviceEvents,
    globalSearchQuery.data?.transactions,
    navigationSearchItems,
    normalizedSearchTerm,
    quickActionItems,
    shouldFetchGlobalRecords
  ])

  const flattenedSearchItems = useMemo(
    () => searchSections.flatMap(section => section.items),
    [searchSections]
  )
  const effectiveActiveSearchItemIndex =
    flattenedSearchItems.length > 0
      ? Math.min(activeSearchItemIndex, flattenedSearchItems.length - 1)
      : 0

  if (isBootstrapping) {
    return <LoadingState title='Page Loading. Please wait...' />
  }

  if (!isAuthenticated || !user) {
    return <LoadingState title='Redirecting to sign in...' />
  }

  async function handleLogout () {
    setIsProfileMenuOpen(false)
    setIsNotificationsMenuOpen(false)
    setIsSearchOpen(false)
    await logout()
    router.replace('/login')
  }

  function handleSelectSearchItem (item: GlobalSearchItem) {
    setIsSearchOpen(false)
    setSearchTerm('')
    setActiveSearchItemIndex(0)
    setIsProfileMenuOpen(false)
    setIsNotificationsMenuOpen(false)
    router.push(item.href)
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

  function handleSearchInputKeyDown (event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!isSearchOpen || flattenedSearchItems.length === 0) {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchItemIndex(currentIndex =>
        currentIndex >= flattenedSearchItems.length - 1
          ? 0
          : currentIndex + 1
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchItemIndex(currentIndex =>
        currentIndex <= 0
          ? flattenedSearchItems.length - 1
          : currentIndex - 1
      )
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const targetItem = flattenedSearchItems[effectiveActiveSearchItemIndex]
      if (targetItem) {
        handleSelectSearchItem(targetItem)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsSearchOpen(false)
    }
  }

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

      <header className='fixed z-10 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm'>
        <div className='flex items-center justify-between gap-3'>
          <div className='items-center flex-1 ml-96 my-2.5'>
            <div className='relative max-w-2xl w-full' ref={searchContainerRef}>
              <div className='flex h-[46px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[#00a6fb]/65 focus-within:ring-2 focus-within:ring-[#00a6fb]/20'>
                <svg
                  aria-hidden='true'
                  className='h-5 w-5 shrink-0 text-slate-400'
                  fill='none'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  viewBox='0 0 24 24'
                >
                  <circle cx='11' cy='11' r='7' />
                  <path d='m20 20-3.5-3.5' />
                </svg>
                <input
                  autoComplete='off'
                  className='h-full w-full border-0 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400 focus:ring-0'
                  id='search'
                  name='search_box'
                  onChange={event => {
                    setSearchTerm(event.target.value)
                    setIsSearchOpen(true)
                    setActiveSearchItemIndex(0)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchInputKeyDown}
                  placeholder='Search members, events, households, transactions, or jump to a page...'
                  ref={searchInputRef}
                  type='text'
                  value={searchTerm}
                />
                {searchTerm ? (
                  <button
                    aria-label='Clear global search'
                    className='inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600'
                    onClick={() => {
                      setSearchTerm('')
                      setActiveSearchItemIndex(0)
                      searchInputRef.current?.focus()
                    }}
                    type='button'
                  >
                    <svg
                      aria-hidden='true'
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                    >
                      <path d='M18 6 6 18' />
                      <path d='m6 6 12 12' />
                    </svg>
                  </button>
                ) : (
                  <span className='text-[11px] font-medium text-slate-400'>
                    Ctrl/Cmd + K
                  </span>
                )}
              </div>

              {isSearchOpen ? (
                <div className='absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]'>
                  <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>
                        Global search
                      </p>
                      <p className='text-xs text-slate-500'>
                        Search data records and jump to key workflows
                      </p>
                    </div>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500'>
                      {normalizedSearchTerm
                        ? `Query: "${searchTerm.trim()}"`
                        : 'Type to start'}
                    </span>
                  </div>

                  {globalSearchQuery.isLoading && shouldFetchGlobalRecords ? (
                    <p className='px-4 py-6 text-center text-sm text-slate-500'>
                      Searching records...
                    </p>
                  ) : globalSearchQuery.error && shouldFetchGlobalRecords ? (
                    <div className='space-y-2 px-4 py-5'>
                      <p className='text-sm font-medium text-red-700'>
                        Search results are temporarily unavailable.
                      </p>
                      <button
                        className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443]'
                        onClick={() => {
                          void globalSearchQuery.refetch()
                        }}
                        type='button'
                      >
                        Retry
                      </button>
                    </div>
                  ) : flattenedSearchItems.length > 0 ? (
                    <div className='max-h-[440px] overflow-y-auto px-2 py-2'>
                      {(() => {
                        let flattenedIndex = 0
                        return searchSections.map(section => (
                          <div className='mb-2 last:mb-0' key={section.title}>
                            <p className='px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500'>
                              {section.title}
                            </p>
                            <ul className='m-0 list-none space-y-1 p-0'>
                              {section.items.map(item => {
                                const itemIndex = flattenedIndex
                                flattenedIndex += 1
                                const isActive =
                                  itemIndex === effectiveActiveSearchItemIndex

                                return (
                                  <li key={item.id}>
                                    <button
                                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                        isActive
                                          ? 'border-[#00a6fb]/50 bg-[#e8f7ff]'
                                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                                      }`}
                                      onClick={() =>
                                        handleSelectSearchItem(item)
                                      }
                                      onMouseEnter={() =>
                                        setActiveSearchItemIndex(itemIndex)
                                      }
                                      type='button'
                                    >
                                      <p className='m-0 text-sm font-semibold text-slate-800'>
                                        {item.title}
                                      </p>
                                      <p className='mt-1 text-xs text-slate-500'>
                                        {item.description}
                                      </p>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))
                      })()}
                    </div>
                  ) : (
                    <p className='px-4 py-6 text-center text-sm text-slate-500'>
                      {normalizedSearchTerm
                        ? 'No results match your query yet. Try another keyword.'
                        : 'Quick actions and navigation shortcuts are ready. Type at least two characters for live records.'}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className='mr-3 flex items-center gap-2'>
            <div className='relative' ref={notificationsMenuRef}>
              <button
                aria-expanded={isNotificationsMenuOpen}
                aria-haspopup='menu'
                aria-label='Open notifications'
                className='relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#00a6fb]/45 hover:bg-[#f3fbff] focus:outline-none focus:ring-2 focus:ring-[#00a6fb]/35'
                onClick={() => {
                  setIsNotificationsMenuOpen(current => !current)
                  setIsProfileMenuOpen(false)
                  setIsSearchOpen(false)
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
                  <span className='absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#00a6fb] px-1 text-[11px] font-semibold leading-none text-white'>
                    {unreadNotificationsCount > 99
                      ? '99+'
                      : unreadNotificationsCount}
                  </span>
                ) : null}
              </button>

              {isNotificationsMenuOpen ? (
                <div className='absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]'>
                  <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>
                        Notifications
                      </p>
                      <p className='text-xs text-slate-500'>
                        {unreadNotificationsCount === 0
                          ? 'All caught up'
                          : `${unreadNotificationsCount} unread`}
                      </p>
                    </div>
                    <button
                      className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443] disabled:cursor-not-allowed disabled:opacity-40'
                      disabled={unreadNotificationsCount === 0}
                      onClick={handleMarkAllNotificationsRead}
                      type='button'
                    >
                      Mark all read
                    </button>
                  </div>

                  {notificationsQuery.isLoading ? (
                    <p className='px-4 py-6 text-center text-sm text-slate-500'>
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
                    <>
                      <div className='max-h-80 overflow-y-auto'>
                        {notifications.map(notification => (
                          <div
                            className='border-b border-slate-100 last:border-b-0'
                            key={notification.id}
                          >
                            <Link
                              className='block px-4 py-3 transition hover:bg-slate-50'
                              href={notification.href}
                              onClick={() => {
                                handleMarkNotificationRead(notification.id)
                                setIsNotificationsMenuOpen(false)
                              }}
                            >
                              <div className='flex items-start justify-between gap-3'>
                                <div>
                                  <p className='text-sm font-semibold text-slate-900'>
                                    {notification.title}
                                  </p>
                                  <p className='mt-1 text-xs text-slate-600'>
                                    {notification.description}
                                  </p>
                                </div>
                                <div className='flex flex-col items-end gap-2'>
                                  <span className='text-[11px] text-slate-400'>
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
                      <div className='border-t border-slate-100 bg-slate-50/70 px-4 py-2.5'>
                        <Link
                          className='text-xs font-medium text-[#16335f] transition hover:text-[#0f2443]'
                          href={hasAuditAccess ? '/audit' : '/settings/support'}
                          onClick={() => setIsNotificationsMenuOpen(false)}
                        >
                          {hasAuditAccess
                            ? 'Open activity timeline'
                            : 'Open support guidance'}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className='px-4 py-6 text-center text-sm text-slate-500'>
                      You have no notifications right now.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <Link
              aria-label='Open help and support'
              className='inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#00a6fb]/45 hover:bg-[#f3fbff] focus:outline-none focus:ring-2 focus:ring-[#00a6fb]/35'
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

            <div className='relative' ref={profileMenuRef}>
              <button
                aria-expanded={isProfileMenuOpen}
                aria-haspopup='menu'
                aria-label='Open profile menu'
                className='inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#00a6fb]/40 bg-gradient-to-br from-white to-[#eff8ff] text-slate-700 shadow-sm transition hover:border-[#00a6fb]/70 focus:outline-none focus:ring-2 focus:ring-[#00a6fb]/35'
                onClick={() => {
                  setIsProfileMenuOpen(current => !current)
                  setIsNotificationsMenuOpen(false)
                  setIsSearchOpen(false)
                }}
                type='button'
              >
                <span className='text-sm font-semibold uppercase'>
                  {initials || 'U'}
                </span>
              </button>
              {isProfileMenuOpen ? (
                <div className='absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]'>
                  <div className='border-b border-slate-100 bg-slate-50/70 px-4 py-3'>
                    <p className='truncate text-sm font-semibold text-slate-900'>
                      {displayName}
                    </p>
                    <p className='truncate text-xs text-slate-500'>
                      {user.email}
                    </p>
                  </div>
                  <div className='py-2'>
                    <Link
                      className='block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900'
                      href='/settings/profile'
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      className='block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900'
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
                </div>
              ) : null}
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
