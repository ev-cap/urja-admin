import AdminLayout from '../../components/AdminLayout'

export default function RBACPage() {
  return (
    <AdminLayout>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Role-Based Access Control</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user roles, permissions, and access levels.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Role
          </button>
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Roles & Permissions</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Coming soon: Role management system with granular permission controls.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">User Assignments</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Coming soon: User role assignment and management interface.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 