import AdminLayout from '../../components/AdminLayout'

export default function ContentPage() {
  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Content & Announcements</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage website content, announcements, and promotional materials.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create New
          </button>
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Content</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Coming soon: Content management system with rich text editor and media uploads.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 