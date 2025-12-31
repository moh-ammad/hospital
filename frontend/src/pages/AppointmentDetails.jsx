import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  DollarSign,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compareApi } from '../services/api';

const AppointmentDetails = () => {
  const { clientId, clientEmail, appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);

  const loadAppointmentDetails = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer navigation state (no additional network calls)
      const stateAppt = location.state?.appointment;
      if (stateAppt) {
        setAppointment(stateAppt);
        return;
      }

      const compareResult = await compareApi.sync(parseInt(clientId));
      
      if (!compareResult.success) {
        toast.error(compareResult.error || 'Failed to load appointment');
        return;
      }

      // Find the appointment
      const decodedEmail = decodeURIComponent(clientEmail).toLowerCase();
      const matchedDetail = compareResult.matchedDetails?.find(
        detail => detail.lead?.email?.toLowerCase() === decodedEmail
      );

      if (!matchedDetail || !matchedDetail.appointments) {
        toast.error('Appointment not found');
        return;
      }

      const appt = matchedDetail.appointments.find(
        a => a.id === parseInt(appointmentId) || a.intakeQId === appointmentId
      );

      if (!appt) {
        toast.error('Appointment not found');
        return;
      }

      setAppointment(appt);
    } catch (error) {
      console.error('Failed to load appointment details:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, clientEmail, clientId, location.state]);

  useEffect(() => {
    loadAppointmentDetails();
  }, [loadAppointmentDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Appointment not found
          </h3>
          <button
            onClick={() => navigate(`/clients/${clientId}/appointments/${clientEmail}`)}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const status = (appointment.status || '').toLowerCase();
  const isConfirmed = status.includes('confirm');
  const isCancelled = status.includes('cancel') || status.includes('miss');

  const formatDateOnly = (value) => {
    const s = String(value ?? '').trim();
    if (!s) return 'N/A';
    const atIdx = s.toLowerCase().indexOf(' at ');
    if (atIdx > 0) return s.slice(0, atIdx).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(`/clients/${clientId}/appointments/${clientEmail}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Appointments
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
              <p className="text-gray-600 mt-1">{appointment.serviceName || 'N/A'}</p>
            </div>

            {isConfirmed && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Confirmed
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium">
                <XCircle className="w-5 h-5" />
                Cancelled
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Date & Time */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Date & Time</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="text-base font-medium text-gray-900">
                  {formatDateOnly(appointment.startDate)}
                </p>
              </div>
              {appointment.duration && (
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.duration} minutes
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Service</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Service Name</p>
                <p className="text-base font-medium text-gray-900">
                  {appointment.serviceName || 'N/A'}
                </p>
              </div>
              {appointment.price && (
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="text-base font-medium text-gray-900">
                    ${appointment.price}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Practitioner */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Practitioner</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-base font-medium text-gray-900">
                  {appointment.practitionerName || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Location</h3>
            </div>
            <div className="space-y-2">
              {appointment.locationName && (
                <div>
                  <p className="text-sm text-gray-600">Location Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.locationName}
                  </p>
                </div>
              )}
              {appointment.placeOfService && (
                <div>
                  <p className="text-sm text-gray-600">Place of Service</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.placeOfService}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Details - Only for Confirmed */}
        {isConfirmed && (appointment.invoiceId || appointment.invoiceNumber) && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Invoice Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointment.invoiceId && (
                <div>
                  <p className="text-sm text-gray-600">Invoice ID</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.invoiceId}
                  </p>
                </div>
              )}
              {appointment.invoiceNumber && (
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.invoiceNumber}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Details - Only for Cancelled */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-red-900">Cancellation Details</h3>
            </div>
            <div className="space-y-3">
              {appointment.fullCancellationReason && (
                <div>
                  <p className="text-sm text-red-700 font-medium">Reason</p>
                  <p className="text-base text-red-900">
                    {appointment.fullCancellationReason}
                  </p>
                </div>
              )}
              {appointment.cancellationReasonNote && (
                <div>
                  <p className="text-sm text-red-700 font-medium">Note</p>
                  <p className="text-base text-red-900">
                    {appointment.cancellationReasonNote}
                  </p>
                </div>
              )}
              {appointment.cancellationDate && (
                <div>
                  <p className="text-sm text-red-700 font-medium">Cancelled On</p>
                  <p className="text-base text-red-900">
                    {appointment.cancellationDate}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {appointment.reminderType && (
              <div>
                <p className="text-gray-600">Reminder Type</p>
                <p className="font-medium text-gray-900">{appointment.reminderType}</p>
              </div>
            )}
            {appointment.practitionerNote && (
              <div className="md:col-span-2">
                <p className="text-gray-600 mb-1">Practitioner Note</p>
                <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded">
                  {appointment.practitionerNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;
