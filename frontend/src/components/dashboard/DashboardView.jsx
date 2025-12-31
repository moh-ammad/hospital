import {
  RefreshCw,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Activity
} from 'lucide-react';
import { useEffect } from 'react';



const DashboardView = ({ 
  loading,
  fetching,
  clients,
  stats,
  onFetchAll,
  onAddClient,
  onClientClick
}) => {
    useEffect(()=>{
    console.log('Clients updated:', clients);
    },[clients])
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                CRM-EMR Integration Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your appointments and leads synchronization
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onFetchAll}
                disabled={fetching || clients.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
              >
                {fetching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Fetch All
                  </>
                )}
              </button>

              <button
                onClick={onAddClient}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Client
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalClients}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalAppointments.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Matched</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.matchedAppointments.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unmatched</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.unmatchedAppointments.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Clients</h2>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No clients configured
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first client
              </p>
              <button
                onClick={onAddClient}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
                Add Client
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => onClientClick(client.id)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {client.name}
                        </h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{client.stats?.totalAppointments || 0} appointments</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{client.stats?.totalLeads || 0} leads</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
