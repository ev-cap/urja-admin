'use client'

import AdminLayout from '../../components/AdminLayout'

export default function RewardsPage() {
  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Rewards Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage rewards, points, and referral programs.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create Reward
          </button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stats cards */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Points Distributed</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">25,000</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Rewards</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">12</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Referral Signups</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">156</dd>
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Rewards Program</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Coming soon: Rewards and points management system with referral tracking.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 