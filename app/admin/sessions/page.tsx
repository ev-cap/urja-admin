'use client';

import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';

interface Session {
  _id: {
    $oid: string;
  };
  stationId: {
    $oid: string;
  };
  userId: {
    $oid: string;
  };
  vehicle: string | { make?: string; model?: string; year?: string };
  start_time: {
    $date: string;
  };
  end_time?: {
    $date: string;
  };
  energyConsumed_kWh: number;
  cost: number;
  connector: string;
  status: 'in-progress' | 'completed' | 'failed' | 'cancelled';
  payment: 'pending' | 'completed' | 'failed';
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip the first render
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const fetchSessions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:4000/sessions');
        const data = await response.json();
        console.log('Sessions API Response:', data);
        
        // Ensure data is an array before setting state
        let sessionsArray = [];
        if (Array.isArray(data)) {
          sessionsArray = data;
        } else if (data && Array.isArray(data.sessions)) {
          sessionsArray = data.sessions;
        }
        
        setSessions(sessionsArray);
        setError(null);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setError('Failed to load sessions data');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getMongoId = (id: any): string => {
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && '$oid' in id) return id.$oid;
    return 'Unknown';
  };

  const getVehicleDisplay = (vehicle: any): string => {
    if (!vehicle) return 'No vehicle';
    if (typeof vehicle === 'string') {
      // If it's a vehicle ID, show a shortened version
      if (vehicle.length > 10) {
        return `${vehicle.substring(0, 10)}...`;
      }
      return vehicle;
    }
    if (typeof vehicle === 'object') {
      // If it's a vehicle object, try to construct a readable string
      const parts = [];
      if (vehicle.make) parts.push(vehicle.make);
      if (vehicle.model) parts.push(vehicle.model);
      if (vehicle.year) parts.push(vehicle.year);
      if (parts.length > 0) return parts.join(' ');
    }
    return 'Unknown vehicle';
  };

  const getStatusBadgeStyle = (status: Session['status']) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeStyle = (status: Session['payment']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate stats from sessions data
  const getStatsData = () => {
    if (!Array.isArray(sessions)) {
      console.error('Sessions is not an array:', sessions);
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalEnergy: '0.00',
        totalRevenue: '0.00'
      };
    }

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s?.status === 'in-progress').length;
    const totalEnergy = sessions.reduce((sum, session) => sum + (session?.energyConsumed_kWh || 0), 0);
    const totalRevenue = sessions.reduce((sum, session) => sum + (session?.cost || 0), 0);
    
    return {
      totalSessions,
      activeSessions,
      totalEnergy: totalEnergy.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2)
    };
  };

  const stats = getStatsData();

  // Calculate duration between start and end time
  const calculateDuration = (start: any, end?: any) => {
    try {
      const startDate = new Date(start?.$date ?? start);
      const endDate = end ? new Date(end?.$date ?? end) : new Date();
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'N/A';
    }
  };

  const formatDate = (dateValue: any) => {
    try {
      // Handle both MongoDB date format and regular date strings
      const date = new Date(dateValue?.$date ?? dateValue);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Charging Sessions</h1>
          <p className="mt-2 text-sm text-gray-700">
            View all charging sessions across stations.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Sessions</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalSessions}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Sessions</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.activeSessions}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Energy (kWh)</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalEnergy}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Revenue (₹)</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalRevenue}</dd>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading sessions...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No sessions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Station ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Vehicle
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Start Time
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Duration
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Energy (kWh)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Cost (₹)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Connector
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sessions.map((session, index) => (
                    <tr key={`session-${getMongoId(session._id)}-${index}`}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getMongoId(session.stationId)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getMongoId(session.userId)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getVehicleDisplay(session.vehicle)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatDate(session.start_time)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {calculateDuration(session.start_time, session.end_time)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{session.energyConsumed_kWh}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{session.cost}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{session.connector}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusBadgeStyle(session.status)
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getPaymentStatusBadgeStyle(session.payment)
                        }`}>
                          {session.payment}
                        </span>
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