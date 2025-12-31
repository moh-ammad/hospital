import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import Badge from './Badge';

const EmailAppointmentsView = ({ 
  selectedClientEmail, 
  onBack, 
  onAppointmentClick, 
  formatDate,
  getStatusBadge 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [appointmentFilter, setAppointmentFilter] = useState('all');

  // Filter appointments based on selected filter
  const allAppointments = selectedClientEmail.data?.appointments || [];
  const filteredAppointments = appointmentFilter === 'all' 
    ? allAppointments 
    : appointmentFilter === 'confirmed'
      ? allAppointments.filter(appt => {
          const status = (appt.status || '').toLowerCase();
          return status.includes('confirm');
        })
      : allAppointments.filter(appt => {
          const status = (appt.status || '').toLowerCase();
          return status.includes('cancel') || status.includes('miss');
        });
  
  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);
  
  const handlePageInput = (e) => {
    const value = e.target.value;
    setPageInput(value);
  };
  
  const goToPage = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handleFilterChange = (filter) => {
    setAppointmentFilter(filter);
    setCurrentPage(1);
    setPageInput('1');
  };

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
            Back to Client Details
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedClientEmail.data?.name || 'Client'}</h1>
            <p className="text-gray-600 mt-1">{selectedClientEmail.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats - Clickable Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => handleFilterChange('all')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition text-left hover:shadow-lg ${
              appointmentFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {selectedClientEmail.data?.totalAppointments || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleFilterChange('confirmed')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition text-left hover:shadow-lg ${
              appointmentFilter === 'confirmed' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {selectedClientEmail.data?.confirmed || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleFilterChange('cancelled')}
            className={`bg-white rounded-xl shadow-md p-6 border-2 transition text-left hover:shadow-lg ${
              appointmentFilter === 'cancelled' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {selectedClientEmail.data?.cancelled || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {appointmentFilter === 'all' ? 'All Appointments' : 
                 appointmentFilter === 'confirmed' ? 'Confirmed Appointments' : 
                 'Cancelled Appointments'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
              </p>
            </div>
            
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                  setPageInput('1');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Practitioner</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    onClick={() => onAppointmentClick(appointment)}
                    className="hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(appointment.startDate || appointment.startDateLocalFormatted || appointment.startDateLocal || appointment.startDateIso)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {appointment.serviceName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {appointment.practitionerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge value={getStatusBadge(appointment.status)} defaultClass="bg-gray-100 text-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    setPageInput('1');
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    setPageInput(newPage.toString());
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                {/* Page number input */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Go to:</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={handlePageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') goToPage();
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={goToPage}
                    className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Go
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    setPageInput(newPage.toString());
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(totalPages);
                    setPageInput(totalPages.toString());
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAppointmentsView;
