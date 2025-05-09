'use client';

import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Station {
  id: string;
  name: string;
  location: string;
  status: string;
  connectors: number;
  power: string;
  price: string;
  rating: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  operator?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  createdAt?: string;
  updatedAt?: string;
  available: boolean;
  type: string;
  workingHours?: {
    open: string;
    close: string;
    isOpen24x7: boolean;
  };
}

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Calculate stats from stations data
  const getStatsData = () => {
    const totalStations = stations.length;
    const activeStations = stations.filter(s => s.status === 'active').length;
    const totalConnectors = stations.reduce((sum, station) => sum + (station.connectors || 0), 0);
    
    return {
      totalStations,
      activeStations,
      totalConnectors,
      totalPower: 0
    };
  };

  useEffect(() => {
    // Skip the first render
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const fetchStations = async () => {
      try {
        const response = await fetch('http://127.0.0.1:4000/stations');
        const data = await response.json();
        
        if (data?.stations) {
          const mappedStations = data.stations.map((station: Partial<Station>) => ({
            ...station,
            status: station.available ? 'active' : 'maintenance',
            connectors: 1, // Default value since it's not in the API
          }));
          setStations(mappedStations);
        } else {
          setStations([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stations:', error);
        setError('Failed to fetch stations');
        setLoading(false);
      }
    };

    fetchStations();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  const stats = getStatsData();

  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Charging Stations</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage all charging stations in the network.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-2" />
            Add Station
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Stations</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalStations}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Stations</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.activeStations}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Connectors</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalConnectors}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Power Capacity</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalPower} kW</dd>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading stations...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : stations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No stations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Location
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Address
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      City/State
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Connectors
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Power (kW)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Price (₹/kWh)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Rating
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Operator
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Maintenance
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Next Maintenance
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Working Hours
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {stations.map((station) => (
                    <tr key={station.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{station.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.latitude && station.longitude ? (
                          <a 
                            href={`https://www.google.com/maps?q=${station.latitude},${station.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Map
                          </a>
                        ) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{station.address ?? '-'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.city && station.state ? `${station.city}, ${station.state}` : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusBadgeStyle(station.status)
                        }`}>
                          {station.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{station.connectors}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{station.power}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.price || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className="text-yellow-400 flex">
                            {[...Array(5)].map((_, index) => (
                              <svg 
                                key={`star-${station.id}-${index}`}
                                className={`h-4 w-4 ${index < (station.rating ?? 0) ? 'fill-current' : 'fill-gray-200'}`}
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </span>
                          <span className="ml-1 text-gray-500">{station.rating ? station.rating.toFixed(1) : '-'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{station.operator ?? '-'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.lastMaintenance ? new Date(station.lastMaintenance).toLocaleDateString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.nextMaintenance ? new Date(station.nextMaintenance).toLocaleDateString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {(() => {
                          if (!station.workingHours) return '-';
                          if (station.workingHours.isOpen24x7) return <span className="text-green-600">24/7</span>;
                          return `${station.workingHours.open} - ${station.workingHours.close}`;
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {station.createdAt ? new Date(station.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}