'use client'

import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'

interface Review {
  id: string;
  rating: number;
  comment: string;
  userId: string;
  stationId: string;
  createdAt: string;
}

export default function RewardsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        console.log('Making API request to:', 'http://127.0.0.1:4000/reviews');
        
        const res = await fetch('http://127.0.0.1:4000/reviews', {
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
          setReviews(data);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to extract an array from it
          const reviewsArray = Object.values(data).find(Array.isArray);
          if (reviewsArray) {
            setReviews(reviewsArray);
          } else {
            setError('Unexpected response format');
          }
        } else {
          setError('Invalid response format');
        }
        
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setError('Failed to fetch reviews data');
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, []);

  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Rewards Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage rewards and review data.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Reviews Data</h3>
            {loading ? (
              <div className="mt-4 text-sm text-gray-500">Loading reviews...</div>
            ) : error ? (
              <div className="mt-4 text-sm text-red-500">{error}</div>
            ) : reviews.length === 0 ? (
              <div className="mt-4 text-sm text-gray-500">No reviews found</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">ID</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rating</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Comment</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">User ID</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Station ID</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{review.id}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{review.rating}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{review.comment}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{review.userId}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{review.stationId}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(review.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 