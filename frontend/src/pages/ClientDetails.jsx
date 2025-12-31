import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compareApi } from '../services/api';

const ClientDetails = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [compareData, setCompareData] = useState(null);
  const [clientAppointments, setClientAppointments] = useState([]);

  const loadClientDetails = useCallback(async () => {
    setLoading(true);
    try {
      // Get compare data to show matched/unmatched stats
      const compareResult = await compareApi.sync(parseInt(clientId));
      
      if (!compareResult.success) {
        toast.error(compareResult.error || 'Failed to load client data');
        return;
      }

      setCompareData(compareResult);

      // Group appointments by client email
      const appointmentsByEmail = {};
      
      if (compareResult.matchedDetails) {
        compareResult.matchedDetails.forEach(detail => {
          const email = detail.lead?.email;
          if (email && detail.appointments) {
            if (!appointmentsByEmail[email]) {
              appointmentsByEmail[email] = {
                email,
                name: detail.appointments[0]?.clientName || 'Unknown',
                totalAppointments: 0,
                confirmed: 0,
                cancelled: 0
              };
            }

            detail.appointments.forEach(appt => {
              appointmentsByEmail[email].totalAppointments++;
              
              const status = (appt.status || '').toLowerCase();
              if (status.includes('confirm')) {
                appointmentsByEmail[email].confirmed++;
              } else if (status.includes('cancel') || status.includes('miss')) {
                appointmentsByEmail[email].cancelled++;
              }
            });
          }
        });
      }

      setClientAppointments(Object.values(appointmentsByEmail));
    } catch (error) {
      console.error('Failed to load client details:', error);
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  const handleClientClick = (clientEmail) => {
    // Find appointments for this email and pass them down to avoid refetching /compare/sync
    const decodedEmail = String(clientEmail || '').toLowerCase();
    const matchedDetail = compareData?.matchedDetails?.find(
      detail => detail.lead?.email?.toLowerCase?.() === decodedEmail
    );

    navigate(`/clients/${clientId}/appointments/${encodeURIComponent(clientEmail)}`, {
      state: {
        clientName: compareData?.clientName,
        clientEmail: clientEmail,
        appointments: matchedDetail?.appointments || null,
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!compareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {compareData.clientName}
            </h1>
            <p className="text-gray-600 mt-1">
              Client appointments and statistics
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {compareData.summary?.totalAppointments?.toLocaleString() || 0}
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
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {compareData.summary?.totalLeads || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Matched Appointments</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {compareData.summary?.matchedAppointments?.toLocaleString() || 0}
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
                <p className="text-sm font-medium text-gray-600">Unmatched Appointments</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {compareData.summary?.unmatchedAppointments?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Client Appointments Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Client Appointments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click on a client to view their appointments
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Client Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Appointments Count
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Confirmed
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cancelled
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientAppointments.map((client, index) => (
                  <tr
                    key={client.email}
                    onClick={() => handleClientClick(client.email)}
                    className="hover:bg-gray-50 cursor-pointer transition group"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {client.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{client.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {client.totalAppointments}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        {client.confirmed}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {client.cancelled}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {clientAppointments.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No appointments found
              </h3>
              <p className="text-gray-600">
                This client has no matched appointments
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
