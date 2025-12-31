import {
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const AppointmentDetailView = ({ appointment, onBack, formatDate }) => {
  const status = (appointment.status || '').toLowerCase();
  const isConfirmed = status.includes('confirm');
  const isCancelled = status.includes('cancel') || status.includes('miss');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
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
                  {formatDate(appointment.startDate || appointment.startDateLocalFormatted || appointment.startDateLocal || appointment.startDateIso)}
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

          {/* Practitioner */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
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
              {appointment.practitionerEmail && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-base font-medium text-gray-900">
                    {appointment.practitionerEmail}
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

          {/* Location */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <MapPin className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Location</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Location Name</p>
                <p className="text-base font-medium text-gray-900">
                  {appointment.locationName || 'N/A'}
                </p>
              </div>
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

        {/* Cancellation Details */}
        {isCancelled && (appointment.fullCancellationReason || appointment.cancellationReasonNote) && (
          <div className="bg-red-50 rounded-xl p-6 border border-red-200 mb-6">
            <h3 className="font-semibold text-red-900 mb-3">Cancellation Details</h3>
            {appointment.fullCancellationReason && (
              <div className="mb-2">
                <p className="text-sm text-red-700 font-medium">Reason</p>
                <p className="text-base text-red-900">{appointment.fullCancellationReason}</p>
              </div>
            )}
            {appointment.cancellationReasonNote && (
              <div>
                <p className="text-sm text-red-700 font-medium">Note</p>
                <p className="text-base text-red-900">{appointment.cancellationReasonNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Invoice Details */}
        {isConfirmed && (appointment.invoiceId || appointment.invoiceNumber) && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="font-semibold text-green-900 mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {appointment.invoiceId && (
                <div>
                  <p className="text-sm text-green-700 font-medium">Invoice ID</p>
                  <p className="text-base text-green-900">{appointment.invoiceId}</p>
                </div>
              )}
              {appointment.invoiceNumber && (
                <div>
                  <p className="text-sm text-green-700 font-medium">Invoice Number</p>
                  <p className="text-base text-green-900">{appointment.invoiceNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailView;
