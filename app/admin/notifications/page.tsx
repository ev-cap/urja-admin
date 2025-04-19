'use client';

import { BellIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const notifications = [
  {
    id: 1,
    type: 'success',
    title: 'New Station Added',
    message: 'A new charging station has been added to the network.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'Maintenance Required',
    message: 'Station #1234 requires maintenance. Please schedule a service visit.',
    time: '5 hours ago',
    read: true,
  },
  {
    id: 3,
    type: 'info',
    title: 'System Update',
    message: 'The system will be updated tonight at 2:00 AM. Expect 30 minutes of downtime.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 4,
    type: 'error',
    title: 'Connection Issue',
    message: 'Station #5678 is experiencing connection issues. Please check the network settings.',
    time: '2 days ago',
    read: false,
  },
  {
    id: 5,
    type: 'success',
    title: 'Payment Processed',
    message: 'Payment of ₹1,250 has been successfully processed for Station #9012.',
    time: '3 days ago',
    read: true,
  },
];

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
  return (
    <div className="pl-34">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <button className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80">
          Mark all as read
        </button>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 transition-colors duration-150 ${
              !notification.read ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                <p className="mt-2 text-xs text-gray-400">{notification.time}</p>
              </div>
              {!notification.read && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                  New
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
          Load More
        </button>
      </div>
    </div>
  );
} 