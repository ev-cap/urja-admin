'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'

interface Reward {
  _id: string;
  reward_id: string;
  reward: string;
  category: string;
  current_points: number;
  total_earned: number;
  total_redeemed: number;
  points_spent: number;
  status: string;
  user: string;
  user_id: string;
  expires_at: string;
  redeemed_at?: string;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await fetch('http://127.0.0.1:4000/rewards');
        const data = await response.json();
        console.log('Rewards API Response:', data);
        setRewards(Array.isArray(data) ? data : data.rewards ?? []);
      } catch (error) {
        console.error('Error fetching rewards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeStyle = (status: string, expiresAt: string) => {
    // Check if reward is expired
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired) {
      return 'bg-red-100 text-red-800';
    }

    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category.toLowerCase()) {
      case 'product':
        return 'bg-purple-100 text-purple-800';
      case 'service':
        return 'bg-blue-100 text-blue-800';
      case 'discount':
        return 'bg-indigo-100 text-indigo-800';
      case 'voucher':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Points Earned</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {rewards.reduce((sum, reward) => sum + reward.total_earned, 0)}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Points Redeemed</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {rewards.reduce((sum, reward) => sum + reward.total_redeemed, 0)}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Rewards</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {rewards.filter(reward => reward.status === 'active').length}
          </dd>
        </div>
      </div>
      
      {/* Rewards Table */}
      <div className="mt-8 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Reward ID</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">User</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reward</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Points</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Points Spent</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Earned</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Redeemed</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Redeemed At</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Expired At</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr key="loading-row">
                <td colSpan={11} className="py-4 pl-4 pr-3 text-center text-sm text-gray-500 sm:pl-6">
                  Loading rewards...
                </td>
              </tr>
            ) : rewards.length === 0 ? (
              <tr key="empty-row">
                <td colSpan={11} className="py-4 pl-4 pr-3 text-center text-sm text-gray-500 sm:pl-6">
                  No rewards found
                </td>
              </tr>
            ) : (
              rewards.map((reward) => (
                <tr key={`reward-${reward._id}`}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {reward.reward_id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.user}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.reward}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getCategoryBadgeStyle(reward.category)}`}>
                      {reward.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.current_points}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.points_spent}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.total_earned}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reward.total_redeemed}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {reward.redeemed_at ? formatDate(reward.redeemed_at) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDate(reward.expires_at)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeStyle(reward.status, reward.expires_at)}`}>
                      {reward.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}