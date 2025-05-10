'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'

interface Booking {
  id: string
  user_id: string
  station_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  vehicle_type: string
  connector_type: string
  payment_status: 'pending' | 'paid' | 'refunded'
  created_at: string
  updated_at: string
  [key: string]: any // Allow for additional fields from API
}

// Sample data
const sampleBookings: Booking[] = [
  {
    id: '1',
    user_id: 'user123',
    station_id: 'station456',
    start_time: '2024-04-22T10:00:00Z',
    end_time: '2024-04-22T12:00:00Z',
    status: 'confirmed',
    vehicle_type: 'Tesla Model 3',
    connector_type: 'CCS2',
    payment_status: 'paid',
    created_at: '2024-04-20T15:30:00Z',
    updated_at: '2024-04-20T15:30:00Z'
  },
  {
    id: '2',
    user_id: 'user456',
    station_id: 'station789',
    start_time: '2024-04-23T14:00:00Z',
    end_time: '2024-04-23T16:00:00Z',
    status: 'pending',
    vehicle_type: 'Hyundai Kona',
    connector_type: 'CHAdeMO',
    payment_status: 'pending',
    created_at: '2024-04-21T09:15:00Z',
    updated_at: '2024-04-21T09:15:00Z'
  },
  {
    id: '3',
    user_id: 'user789',
    station_id: 'station123',
    start_time: '2024-04-24T09:00:00Z',
    end_time: '2024-04-24T11:00:00Z',
    status: 'completed',
    vehicle_type: 'MG ZS EV',
    connector_type: 'CCS2',
    payment_status: 'paid',
    created_at: '2024-04-19T11:45:00Z',
    updated_at: '2024-04-24T11:00:00Z'
  }
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(false)

  useEffect(() => {
    // Skip the first render
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`)
        const data = await response.json()
        console.log('Fetched bookings:', data)
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          setBookings(data)
        } else if (data && typeof data === 'object') {
          // If data is an object, try to extract an array from it
          const bookingsArray = Object.values(data).find(Array.isArray) || []
          setBookings(bookingsArray)
        } else {
          setBookings([])
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching bookings:', error)
        setError('Failed to fetch bookings')
        setLoading(false)
      }
    }

    fetchBookings()

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [])

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border border-purple-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'scheduled':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getPaymentStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'refunded':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get all unique keys from the bookings data
  const getAllKeys = () => {
    const keys = new Set<string>()
    bookings.forEach(booking => {
      Object.keys(booking).forEach(key => {
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
          <h1 className="text-2xl font-semibold text-gray-900">Booking Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage all charging station bookings.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create Booking
          </button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stats cards */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Bookings</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {bookings.length}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Bookings</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {bookings.filter(b => b.status === 'confirmed').length}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Pending Payments</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {bookings.filter(b => b.payment_status === 'pending').length}
          </dd>
        </div>
      </div>
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading bookings...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : bookings.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No bookings found</div>
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
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      {getAllKeys().map((key) => (
                        <td key={`${booking.id}-${key}`} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {key === 'status' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(booking[key])}`}>
                              {booking[key]}
                            </span>
                          ) : key === 'payment_status' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeStyle(booking[key])}`}>
                              {booking[key]}
                            </span>
                          ) : key.includes('time') || key.includes('created') || key.includes('updated') ? (
                            formatDate(booking[key])
                          ) : (
                            booking[key]
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