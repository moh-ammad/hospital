import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compareApi } from '../services/api';

const ClientAppointments = () => {
  const { clientId, clientEmail } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'confirmed', 'cancelled'
  const [clientName, setClientName] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    cancelled: 0
  });

  const stateAppointments = location.state?.appointments;
  const stateClientName = location.state?.clientName;

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer navigation state to avoid re-hitting /compare/sync on nested pages
      let appts = null;
      if (Array.isArray(stateAppointments) && stateAppointments.length > 0) {
        appts = stateAppointments;
        setClientName(stateClientName || appts[0]?.clientName || 'Unknown Client');
      } else {
        const compareResult = await compareApi.sync(parseInt(clientId));
        
        if (!compareResult.success) {
          toast.error(compareResult.error || 'Failed to load appointments');
          return;
        }

        // Find the matching client's appointments
        const decodedEmail = decodeURIComponent(clientEmail).toLowerCase();
        const matchedDetail = compareResult.matchedDetails?.find(
          detail => detail.lead?.email?.toLowerCase() === decodedEmail
        );

        if (!matchedDetail || !matchedDetail.appointments) {
          toast.error('No appointments found for this client');
          return;
        }

        appts = matchedDetail.appointments;
        setClientName(appts[0]?.clientName || 'Unknown Client');
      }

      setAppointments(appts);

      // Calculate stats
      let confirmed = 0;
      let cancelled = 0;

      appts.forEach(appt => {
        const status = (appt.status || '').toLowerCase();
        if (status.includes('confirm')) {
          confirmed++;
        } else if (status.includes('cancel') || status.includes('miss')) {
          cancelled++;
        }
      });

      setStats({
        total: appts.length,
        confirmed,
        cancelled
      });
    } catch (error) {
      console.error('Failed to load appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [clientEmail, clientId, stateAppointments, stateClientName]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') return appointments;
    if (filter === 'confirmed') {
      return appointments.filter(appt => {
        const status = (appt.status || '').toLowerCase();
        return status.includes('confirm');
      });
    }
    if (filter === 'cancelled') {
      return appointments.filter(appt => {
        const status = (appt.status || '').toLowerCase();
        return status.includes('cancel') || status.includes('miss');
      });
    }
    return appointments;
  }, [appointments, filter]);

  const handleAppointmentClick = (appointmentId) => {
    const appt = appointments.find(
      a => a?.id === appointmentId || a?.id === Number(appointmentId) || String(a?.intakeQId) === String(appointmentId)
    );

    navigate(`/clients/${clientId}/appointments/${encodeURIComponent(clientEmail)}/${appointmentId}`, {
      state: {
        appointment: appt || null,
        clientName,
        clientEmail: decodeURIComponent(clientEmail),
      }
    });
  };

  const formatDateOnly = (value) => {
    const s = String(value ?? '').trim();
    if (!s) return 'N/A';
    const atIdx = s.toLowerCase().indexOf(' at ');
    if (atIdx > 0) return s.slice(0, atIdx).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower.includes('confirm')) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Confirmed
        </span>
      );
    } else if (statusLower.includes('cancel')) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          Cancelled
        </span>
      );
    } else if (statusLower.includes('miss')) {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
          Missed
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
          {status}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading appointments...</p>
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
            onClick={() => navigate(`/clients/${clientId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Client Details
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{clientName}</h1>
            <p className="text-gray-600 mt-1">{decodeURIComponent(clientEmail)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition ${
              filter === 'all' ? 'border-indigo-600' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilter('confirmed')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition ${
              filter === 'confirmed' ? 'border-green-600' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-600">Total Confirmed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.confirmed}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilter('cancelled')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition ${
              filter === 'cancelled' ? 'border-orange-600' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-600">Total Cancelled</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.cancelled}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Appointments</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredAppointments.length} of {stats.total} appointments
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>
                Filter: <span className="font-semibold capitalize">{filter}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Practitioner
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment, index) => (
                  <tr
                    key={appointment.id}
                    onClick={() => handleAppointmentClick(appointment.id)}
                    className="hover:bg-gray-50 cursor-pointer transition group"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateOnly(appointment.startDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{appointment.serviceName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {appointment.practitionerName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(appointment.status)}
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAppointments.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No appointments found
              </h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'This client has no appointments'
                  : `No ${filter} appointments found`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientAppointments;
