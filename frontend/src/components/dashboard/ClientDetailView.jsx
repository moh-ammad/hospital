import {
  ArrowLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useEffect } from 'react';
import Badge from './Badge';

const ClientDetailView = ({ 
  selectedClient, 
  clientData, 
  clientDataLoading, 
  onBack, 
  onClientEmailClick 
}) => {
    useEffect(()=>{
    console.log('Client from appointment Data:', clientData);
    },[clientData])
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedClient.name}</h1>
            <p className="text-gray-600 mt-1">Client appointments and statistics</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {clientDataLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading client data...</p>
            </div>
          </div>
        ) : clientData ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Appointments</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {clientData.summary?.totalAppointments?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {clientData.summary?.totalLeads || 0}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <p className="text-sm text-green-600 font-medium">Matched</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {clientData.summary?.matchedAppointments?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <p className="text-sm text-orange-600 font-medium">Unmatched</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {clientData.summary?.unmatchedAppointments?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Client Appointments Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Client Appointments</h2>
                <p className="text-sm text-gray-600 mt-1">Click on a client to view their appointments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Client Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Appointments</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Confirmed</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cancelled</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientData.clientAppointments?.map((ca) => {
                      const confirmedBadge = ca.confirmed;
                      const cancelledBadge = ca.cancelled;

                      return (
                        <tr
                          key={ca.email}
                          onClick={() => onClientEmailClick(ca.email)}
                          className="hover:bg-gray-50 cursor-pointer transition"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{ca.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{ca.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {ca.totalAppointments}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge value={confirmedBadge} defaultClass="bg-green-100 text-green-700" />
                          </td>
                          <td className="px-6 py-4">
                            <Badge value={cancelledBadge} defaultClass="bg-orange-100 text-orange-700" />
                          </td>
                          <td className="px-6 py-4">
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-12">
            <p className="text-gray-600">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailView;
