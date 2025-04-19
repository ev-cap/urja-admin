import AdminLayout from '../../components/AdminLayout'

export default function RewardsPage() {
  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Rewards & Referrals</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage reward programs, referral bonuses, and promotional campaigns.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            New Campaign
          </button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stats cards */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Rewards</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">5</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Referrals</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">128</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Rewards Redeemed</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">89</dd>
        </div>
      </div>
    </AdminLayout>
  )
} 