'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'

interface Activity {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  status: 'success' | 'warning' | 'error' | 'info'
  ip_address: string
  created_at: string
  [key: string]: any // Allow for additional fields from API
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(false)

  useEffect(() => {
    // Skip the first render
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    const fetchActivities = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activitylogs`)
        const data = await response.json()
        

        console.log('Activity Logs API Response:', data)
        
        
        if (Array.isArray(data)) {
          setActivities(data)
        } else if (data && typeof data === 'object') {
          const activitiesArray = Object.values(data).find(Array.isArray) || []
          setActivities(activitiesArray)
        } else {
          setActivities([])
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching activities:', error)
        setError('Failed to fetch activity logs')
        setLoading(false)
      }
    }

    fetchActivities()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [])

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getActionBadgeStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'update':
      case 'updated':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'delete':
      case 'deleted':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'login':
      case 'logout':
        return 'bg-purple-100 text-purple-800 border border-purple-200'
      case 'read':
      case 'view':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Get all unique keys from the activities data
  const getAllKeys = () => {
    const keys = new Set<string>()
    activities.forEach(activity => {
      Object.keys(activity).forEach(key => {
        if (key !== 'id') { // Exclude 'id' field
          keys.add(key)
        }
      })
    })
    return Array.from(keys)
  }

  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Activity Log</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and monitor all system activities and user actions.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Export Logs
          </button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stats cards */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Activities</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {activities.length}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Success Rate</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {activities.length > 0 
              ? `${Math.round((activities.filter(a => a.status === 'success').length / activities.length) * 100)}%`
              : '0%'}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Error Rate</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {activities.length > 0 
              ? `${Math.round((activities.filter(a => a.status === 'error').length / activities.length) * 100)}%`
              : '0%'}
          </dd>
        </div>
      </div>
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading activities...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No activities found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {getAllKeys().map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      {getAllKeys().map((key) => (
                        <td key={`${activity.id}-${key}`} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {key === 'status' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(activity[key])}`}>
                              {activity[key]}
                            </span>
                          ) : key === 'action' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeStyle(activity[key])}`}>
                              {activity[key]}
                            </span>
                          ) : key.includes('created') ? (
                            formatDate(activity[key])
                          ) : (
                            activity[key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
} 