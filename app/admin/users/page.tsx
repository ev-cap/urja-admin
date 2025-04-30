'use client'

import { useEffect, useState, Fragment } from 'react';
import AdminLayout from '../../components/AdminLayout'
import {
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  passwordHash: string;
  authProvider: string;
  createdAt: Date;
  updatedAt: Date;
  rewardPoints: number;
  isactive: boolean;
  preferences: {
    id?: string;
    [key: string]: any;
  };
  vehicles: object[];
  notificationsSettings: object[];
}

interface Vehicle {
  id?: string;  // Making id optional since it might be undefined
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  type: string;
}

interface PaymentMethod {
  methodId?: string;
  methodType?: string;
  tokenizedDetails?: any;
  last4Digits?: string;
  expiry?: string;
}

const PaymentMethodDisplay = ({ value }: { value: PaymentMethod }) => {
  // Safely handle undefined values
  if (!value) return <span className="text-gray-400">No payment method</span>;

  const displayParts = [
    value.methodType,
    value.last4Digits && `****${value.last4Digits}`,
    value.expiry
  ].filter(Boolean);
  
  if (displayParts.length === 0) {
    return <span className="text-gray-400">Invalid payment method</span>;
  }
  
  return (
    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
      {displayParts.join(' • ')}
    </span>
  );
};

const formatExpiryDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  } catch {
    return '-';
  }
};

const PaymentMethodTable = ({ paymentMethods }: { paymentMethods: PaymentMethod[] }) => {
  if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
    return <span className="text-gray-400">No payment methods</span>;
  }

  return (
    <div className="min-w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method ID</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method Type</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokenized Details</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last 4 Digits</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {paymentMethods.map((method, idx) => (
            <tr key={method.methodId ?? idx} className="text-xs">
              <td className="px-3 py-2 whitespace-nowrap text-gray-600 font-mono">{method.methodId}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{method.methodType}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600 font-mono">{method.tokenizedDetails}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{method.last4Digits ? `••••${method.last4Digits}` : '-'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatExpiryDate(method.expiry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PreferenceValue = ({ value, keyName }: { value: any; keyName: string }) => {
  if (value === null) return <span className="text-gray-400">null</span>;
  if (value === undefined) return <span className="text-gray-400">-</span>;
  
  // Handle payment methods array
  if (Array.isArray(value) && (keyName === 'paymentMethods' || keyName.includes('payment'))) {
    return <PaymentMethodTable paymentMethods={value} />;
  }
  
  // Handle single payment method object
  if (typeof value === 'object' && value !== null && 
      (keyName === 'paymentMethod' || keyName.includes('payment'))) {
    return <PaymentMethodTable paymentMethods={[value]} />;
  }
  
  // Rest of the existing PreferenceValue logic for other types
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">Empty array</span>;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((item, idx) => (
          <span 
            key={`${keyName}-item-${idx}`} 
            className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs"
          >
            {typeof item === 'object' ? JSON.stringify(item) : item}
          </span>
        ))}
      </div>
    );
  }
  
  // Handle other object types
  if (typeof value === 'object') {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(value).map(([k, v]) => {
          let displayValue = '';
          if (v === null) {
            displayValue = 'null';
          } else if (typeof v === 'object') {
            try {
              displayValue = JSON.stringify(v);
            } catch {
              displayValue = '[Complex Object]';
            }
          } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            displayValue = v.toString();
          } else {
            displayValue = typeof v === 'undefined' ? '-' : '[Unknown Type]';
          }
          
          return (
            <span key={`${keyName}-${k}`} className="inline-flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full text-xs">
              <span className="font-medium">{k}:</span>
              <span>{displayValue}</span>
            </span>
          );
        })}
      </div>
    );
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value.toString()}
      </span>
    );
  }
  
  return <span className="text-gray-600">{String(value)}</span>;
};

const getVehicleTypeIcon = (type: string) => {
  return <span className="text-gray-600 font-medium">{type}</span>;
};

const getEnabledNotificationsCount = (settings: any) => {
  if (!settings || typeof settings !== 'object') return 0;
  
  // Count only top-level boolean true values, ignore nested objects
  return Object.entries(settings).reduce((count, [key, value]) => {
    // Skip if the value is an object (like modesToUpdate)
    if (typeof value === 'object') return count;
    // Only count boolean true values
    return count + (value === true ? 1 : 0);
  }, 0);
};

export default function UsersPage() {
  const [Users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [expandedNotificationsId, setExpandedNotificationsId] = useState<number | null>(null);
  const [expandedPreferencesId, setExpandedPreferencesId] = useState<number | null>(null);

  const toggleVehicleDetails = (userId: number) => {
    setExpandedUserId(currentId => currentId === userId ? null : userId);
    // Close other expanded sections
    setExpandedNotificationsId(null);
    setExpandedPreferencesId(null);
  };

  const toggleNotificationDetails = (userId: number) => {
    setExpandedNotificationsId(currentId => currentId === userId ? null : userId);
    // Close other expanded sections
    setExpandedUserId(null);
    setExpandedPreferencesId(null);
  };

  const togglePreferencesDetails = (userId: number) => {
    setExpandedPreferencesId(currentId => currentId === userId ? null : userId);
    // Close other expanded sections
    setExpandedUserId(null);
    setExpandedNotificationsId(null);
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log('Making API request to:', 'http://127.0.0.1:4000/users');
        
        const res = await fetch('http://127.0.0.1:4000/users', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        console.log('Response status:', res.status);
        console.log('Response headers:', Object.fromEntries(res.headers.entries()));
        
        const data = await res.json();
        console.log('Raw API Response:', data);
        
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to extract an array from it
          const UsersArray = Object.values(data).find(Array.isArray);
          if (UsersArray) {
            setUsers(UsersArray);
          } else {
            setError('Unexpected response format');
          }
        } else {
          setError('Invalid response format');
        }
        
      } catch (error) {
        console.error('Error fetching Users:', error);
        setError('Failed to fetch Users data');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user accounts, roles, and permissions across the platform
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <UserPlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Total Users</dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">1,234</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Active Users</dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">1,012</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserMinusIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Inactive Users</dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">222</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Admins</dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">15</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>


        {/* Users Table */}
        <div className="mt-8 flow-root">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Name
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Contact
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Auth Provider
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Vehicles
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Notifications
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Reward Points
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Created At
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Updated At
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Preferences
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Users.map((user) => (
                        <Fragment key={user.id}>
                          <tr>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {user.firstname} {user.lastname}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PhoneIcon className="h-4 w-4 text-gray-400" />
                                <span>{user.phone}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {user.authProvider}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <button
                                onClick={() => toggleVehicleDetails(user.id)}
                                className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                              >
                                {Array.isArray(user.vehicles) ? user.vehicles.length : 0} vehicles
                                <svg
                                  className={`ml-1.5 h-4 w-4 transition-transform ${
                                    expandedUserId === user.id ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <button
                                onClick={() => toggleNotificationDetails(user.id)}
                                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                {getEnabledNotificationsCount(user.notificationsSettings)} enabled
                                <svg
                                  className={`ml-1.5 h-4 w-4 transition-transform ${
                                    expandedNotificationsId === user.id ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                {user.rewardPoints || 0} points
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                user.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.isactive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(user.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <button
                                onClick={() => togglePreferencesDetails(user.id)}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                              >
                                <Cog6ToothIcon className="h-4 w-4 mr-1" />
                                {Object.keys(user.preferences || {}).length} settings
                                <svg
                                  className={`ml-1.5 h-4 w-4 transition-transform ${
                                    expandedPreferencesId === user.id ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                          {expandedUserId === user.id && Array.isArray(user.vehicles) && user.vehicles.length > 0 && (
                            <tr>
                              <td colSpan={10} className="px-3 py-4 bg-gray-50">
                                <div className="overflow-x-auto rounded-lg bg-white shadow-inner border border-gray-200 p-4">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 rounded-t-lg">
                                      <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Make
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Model
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Year
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          License Plate
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Type
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                      {(user.vehicles as Vehicle[]).map((vehicle, index) => (
                                        <tr key={`${user.id}-vehicle-${vehicle.id ?? index}`} 
                                            className="text-sm hover:bg-gray-50 transition-colors duration-150">
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{vehicle.make}</td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{vehicle.model}</td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{vehicle.year}</td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{vehicle.licensePlate}</td>
                                          <td className="whitespace-nowrap px-3 py-2.5 flex justify-start items-center">
                                            {getVehicleTypeIcon(vehicle.type)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          {expandedNotificationsId === user.id && user.notificationsSettings && (
                            <tr>
                              <td colSpan={10} className="px-3 py-4 bg-gray-50">
                                <div className="overflow-x-auto rounded-lg bg-white shadow-inner border border-gray-200 p-4">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 rounded-t-lg">
                                      <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Setting
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Status
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Modes
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                      {Object.entries(user.notificationsSettings).map(([key, value], index) => (
                                        <tr key={`${user.id}-notification-${index}`} 
                                            className="text-sm hover:bg-gray-50 transition-colors duration-150">
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                                            {typeof value === 'boolean' ? (
                                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                              }`}>
                                                {value ? 'Enabled' : 'Disabled'}
                                              </span>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                                            {typeof value === 'object' && value !== null ? (
                                              <div className="flex gap-2">
                                                {Object.entries(value).map(([modeKey, modeValue]) => (
                                                  modeValue === true && (
                                                    <span key={modeKey} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                      {modeKey}
                                                    </span>
                                                  )
                                                ))}
                                              </div>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          {expandedPreferencesId === user.id && user.preferences && (
                            <tr>
                              <td colSpan={10} className="px-3 py-4 bg-gray-50">
                                <div className="overflow-x-auto rounded-lg bg-white shadow-inner border border-gray-200 p-4">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 rounded-t-lg">
                                      <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Setting
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Value
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                      {Object.entries(user.preferences).map(([key, value], index) => (
                                        <tr key={`${user.id}-preference-${index}`} 
                                            className="text-sm hover:bg-gray-50 transition-colors duration-150">
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                                            <PreferenceValue value={value} keyName={key} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

