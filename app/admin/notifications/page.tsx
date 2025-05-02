'use client';

import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import AdminLayout from '../../components/AdminLayout';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  read_at: string | null;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case 'warning':
      return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />;
    case 'error':
      return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
    default:
      return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('http://127.0.0.1:4000/notifications');
        const data = await response.json();
        console.log('Fetched notifications:', data);
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          setNotifications(data);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to extract an array from it
          const notificationsArray = Object.values(data).find(Array.isArray) || [];
          setNotifications(notificationsArray);
        } else {
          setNotifications([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError('Failed to fetch notifications');
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Helper function to safely count notifications
  const getUnreadCount = () => notifications.filter(n => !n.is_read).length;
  const getTotalCount = () => notifications.length;
  const getCriticalCount = () => notifications.filter(n => n.priority === 'high').length;

  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage system notifications, alerts, and important updates.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Mark all as read
          </button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stats cards */}
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Unread Notifications</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {getUnreadCount()}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Notifications</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {getTotalCount()}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">High Priority Alerts</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {getCriticalCount()}
          </dd>
        </div>
      </div>
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading notifications...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No notifications found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Title
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Message
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Priority
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created At
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Read At
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className={!notification.is_read ? 'bg-blue-50' : ''}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {notification.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {notification.user_id}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">{notification.message}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          notification.type === 'system' 
                            ? 'bg-blue-100 text-blue-800'
                            : notification.type === 'error'
                            ? 'bg-red-100 text-red-800'
                            : notification.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : notification.type === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          notification.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : notification.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {notification.read_at ? new Date(notification.read_at).toLocaleString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {!notification.is_read ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                            Unread
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Read
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Load More
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}