'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BellIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  MegaphoneIcon,
  GiftIcon,
  DocumentTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon,
  StarIcon,
  ClockIcon,
  CreditCardIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Stations', href: '/admin/stations', icon: BuildingOfficeIcon },
  { name: 'Sessions', href: '/admin/sessions', icon: ClockIcon },
  { name: 'Bookings', href: '/admin/bookings', icon: CalendarIcon },
  { name: 'Transactions', href: '/admin/transactions', icon: CurrencyDollarIcon },
  { name: 'Payment', href: '/admin/payments', icon: CreditCardIcon },
  { name: 'Reports & Feedback', href: '/admin/reports', icon: ChartBarIcon },
  { name: 'Content & Announcements', href: '/admin/content', icon: MegaphoneIcon },
  { name: 'Rewards & Referrals', href: '/admin/rewards', icon: GiftIcon },
  { name: 'Logs & Analytics', href: '/admin/logs', icon: DocumentTextIcon },
  { name: 'Community', href: '/admin/community', icon: UsersIcon },
  { name: 'RBAC', href: '/admin/rbac', icon: ShieldCheckIcon },
  { name: 'Notifications', href: '/admin/notifications', icon: BellIcon },
  { name: 'Reviews and Ratings', href: '/admin/reviews', icon: StarIcon },
  { name: 'User Management', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100 mt-4 md:mt-6">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button
          type="button"
          className="text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link href="/admin" className="text-lg font-bold text-gray-900">
          URJA Admin
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar & overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
          {/* Mobile close button */}
          <div className="md:hidden flex justify-end p-4">
            <button
              type="button"
              className="text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-16 px-4 bg-primary">
              <Link href="/admin" className="text-white text-xl font-bold">
                URJA Admin
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary/20 text-primary border-l-4 border-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* User Menu */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <UserCircleIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">admin@urja.com</p>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <Link
                  href="/admin/notifications"
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    pathname === '/admin/notifications'
                      ? 'bg-primary/20 text-primary border-l-4 border-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BellIcon className={`w-5 h-5 mr-3 ${pathname === '/admin/notifications' ? 'text-primary' : 'text-gray-500'}`} />
                  Notifications
                </Link>
                <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50">
                  <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="pt-16 md:pt-0 md:ml-34 p-4 mt-10 md:mt-0 flex-1">
          <div className={`h-full ${
            pathname === '/admin/notifications' ? 'pt-4 pr-4 pb-4' : ''
          }`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}