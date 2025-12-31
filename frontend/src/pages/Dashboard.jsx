import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Activity,
  X,
  ArrowLeft,
  Clock,
  MapPin,
  DollarSign,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import SetupWizard from '../components/SetupWizard';
import { clientApi, fetchAll, compareApi } from '../services/api';

const Dashboard = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalAppointments: 0,
    matchedAppointments: 0,
    unmatchedAppointments: 0,
  });

  // Internal page navigation (no URL change)
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'clientDetail', 'emailAppointments', 'appointmentDetail'
  const [navigationStack, setNavigationStack] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientEmail, setSelectedClientEmail] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [clientDataLoading, setClientDataLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  
  // Filter state for email appointments
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all', 'confirmed', 'cancelled'

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const result = await clientApi.getAll();
      
      if (!result.success) {
        toast.error(result.error || 'Failed to load clients');
        return;
      }

      const clientsList = result.clients || [];
      setClients(clientsList);

      let totalAppts = 0;
      let totalMatched = 0;
      let totalUnmatched = 0;

      for (const client of clientsList) {
        if (client.stats) {
          totalAppts += client.stats.totalAppointments || 0;
          totalMatched += client.stats.matchedAppointments || 0;
          totalUnmatched += client.stats.unmatchedAppointments || 0;
        }
      }

      setStats({
        totalClients: clientsList.length,
        totalAppointments: totalAppts,
        matchedAppointments: totalMatched,
        unmatchedAppointments: totalUnmatched,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAll = async () => {
    if (clients.length === 0) {
      toast.error('No clients configured');
      return;
    }

    setFetching(true);
    const errors = [];

    try {
      for (const client of clients) {
        toast.loading(`Fetching data for ${client.name}...`, { id: client.id });

        try {
          const result = await fetchAll(client.id, client.name);
          
          if (!result.success) {
            errors.push(`${client.name}: ${result.error}`);
            toast.error(`Failed for ${client.name}`, { id: client.id });
          } else {
            toast.success(`Completed ${client.name}`, { id: client.id });
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`FetchAll failed for client ${client?.name || client?.id}:`, error);
          errors.push(`${client.name}: ${error.message}`);
          toast.error(`Failed for ${client.name}`, { id: client.id });
        }
      }

      if (errors.length === 0) {
        toast.success('All clients synced successfully!');
      } else {
        toast.error(`${errors.length} client(s) failed to sync`);
      }

      await loadDashboard();
    } catch (error) {
      console.error('Fetch operation failed:', error);
      toast.error('Fetch operation failed');
    } finally {
      setFetching(false);
    }
  };

  // Format date as a short date (e.g. "Dec 31, 2025").
  // Accepts Date objects, timestamps, ISO strings, and common server formats.
  const formatDate = (dateInput) => {
    if (!dateInput && dateInput !== 0) return 'N/A';

    let date;
    try {
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        let str = String(dateInput).trim();
        
        // Handle " at " format (e.g. "12/1/2026 at 01:00:00 PM")
        const atIndex = str.toLowerCase().indexOf(' at ');
        if (atIndex > 0) {
            str = str.substring(0, atIndex).trim();
        }

        // Handle /Date(1234567890)/ style timestamps
        const msMatch = str.match(/\/?Date\((\d+)\)\/?/i);
        if (msMatch) {
          date = new Date(Number(msMatch[1]));
        } else if (/^\d+$/.test(str)) {
          // pure numeric string -> treat as timestamp
          date = new Date(Number(str));
        } else {
          date = new Date(str);
        }
      }

      if (!date || isNaN(date.getTime())) return 'N/A';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      console.error(e)
      return 'N/A';
    }
  };

  const navigateTo = (view, data = {}) => {
    setNavigationStack([...navigationStack, { view: currentView, data: { selectedClient, selectedClientEmail, selectedAppointment, clientData } }]);
    setCurrentView(view);
    
    // Reset pagination and filters when navigating
    setCurrentPage(1);
    setPageInput('1');
    setAppointmentFilter('all');
    
    if (data.client) setSelectedClient(data.client);
    if (data.clientEmail) setSelectedClientEmail(data.clientEmail);
    if (data.appointment) setSelectedAppointment(data.appointment);
    if (data.clientData) setClientData(data.clientData);
  };

  const goBack = () => {
    if (navigationStack.length === 0) return;
    
    const previous = navigationStack[navigationStack.length - 1];
    setNavigationStack(navigationStack.slice(0, -1));
    setCurrentView(previous.view);
    setSelectedClient(previous.data.selectedClient);
    setSelectedClientEmail(previous.data.selectedClientEmail);
    setSelectedAppointment(previous.data.selectedAppointment);
    setClientData(previous.data.clientData);
    
    // Reset pagination
    setCurrentPage(1);
    setPageInput('1');
  };

  const handleClientClick = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setClientDataLoading(true);
    navigateTo('clientDetail', { client });
    
    try {
      const compareResult = await compareApi.sync(clientId);
      
      if (!compareResult.success) {
        toast.error(compareResult.error || 'Failed to load client data');
        goBack();
        return;
      }

      // Group appointments by email
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
                cancelled: 0,
                appointments: []
              };
            }

            detail.appointments.forEach(appt => {
              appointmentsByEmail[email].totalAppointments++;
              appointmentsByEmail[email].appointments.push(appt);
              
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

      const fullClientData = {
        ...compareResult,
        clientAppointments: Object.values(appointmentsByEmail)
      };
      
      setClientData(fullClientData);
    } catch (error) {
      console.error('Failed to load client details:', error);
      toast.error('Failed to load client details');
      goBack();
    } finally {
      setClientDataLoading(false);
    }
  };

  const handleClientEmailClick = (clientEmail) => {
    const emailData = clientData?.clientAppointments?.find(ca => ca.email === clientEmail);
    navigateTo('emailAppointments', { clientEmail: { email: clientEmail, data: emailData } });
  };

  const handleAppointmentClick = (appointment) => {
    navigateTo('appointmentDetail', { appointment });
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ============ RENDER APPOINTMENT DETAIL VIEW ============
  if (currentView === 'appointmentDetail' && selectedAppointment) {
    const status = (selectedAppointment.status || '').toLowerCase();
    const isConfirmed = status.includes('confirm');
    const isCancelled = status.includes('cancel') || status.includes('miss');

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Appointments
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
                <p className="text-gray-600 mt-1">{selectedAppointment.serviceName || 'N/A'}</p>
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
                    {formatDate(selectedAppointment.startDate || selectedAppointment.startDateLocalFormatted || selectedAppointment.startDateLocal || selectedAppointment.startDateIso)}
                  </p>
                </div>
                {selectedAppointment.duration && (
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedAppointment.duration} minutes
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
                    {selectedAppointment.practitionerName || 'N/A'}
                  </p>
                </div>
                {selectedAppointment.practitionerEmail && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedAppointment.practitionerEmail}
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
                    {selectedAppointment.serviceName || 'N/A'}
                  </p>
                </div>
                {selectedAppointment.price && (
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-base font-medium text-gray-900">
                      ${selectedAppointment.price}
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
                    {selectedAppointment.locationName || 'N/A'}
                  </p>
                </div>
                {selectedAppointment.placeOfService && (
                  <div>
                    <p className="text-sm text-gray-600">Place of Service</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedAppointment.placeOfService}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation Details */}
          {isCancelled && (selectedAppointment.fullCancellationReason || selectedAppointment.cancellationReasonNote) && (
            <div className="bg-red-50 rounded-xl p-6 border border-red-200 mb-6">
              <h3 className="font-semibold text-red-900 mb-3">Cancellation Details</h3>
              {selectedAppointment.fullCancellationReason && (
                <div className="mb-2">
                  <p className="text-sm text-red-700 font-medium">Reason</p>
                  <p className="text-base text-red-900">{selectedAppointment.fullCancellationReason}</p>
                </div>
              )}
              {selectedAppointment.cancellationReasonNote && (
                <div>
                  <p className="text-sm text-red-700 font-medium">Note</p>
                  <p className="text-base text-red-900">{selectedAppointment.cancellationReasonNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Invoice Details */}
          {isConfirmed && (selectedAppointment.invoiceId || selectedAppointment.invoiceNumber) && (
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedAppointment.invoiceId && (
                  <div>
                    <p className="text-sm text-green-700 font-medium">Invoice ID</p>
                    <p className="text-base text-green-900">{selectedAppointment.invoiceId}</p>
                  </div>
                )}
                {selectedAppointment.invoiceNumber && (
                  <div>
                    <p className="text-sm text-green-700 font-medium">Invoice Number</p>
                    <p className="text-base text-green-900">{selectedAppointment.invoiceNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ RENDER EMAIL APPOINTMENTS VIEW ============
  if (currentView === 'emailAppointments' && selectedClientEmail) {
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
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <button
              onClick={goBack}
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
          {/* Stats - Now Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => {
                setAppointmentFilter('all');
                setCurrentPage(1);
                setPageInput('1');
              }}
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
              onClick={() => {
                setAppointmentFilter('confirmed');
                setCurrentPage(1);
                setPageInput('1');
              }}
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
              onClick={() => {
                setAppointmentFilter('cancelled');
                setCurrentPage(1);
                setPageInput('1');
              }}
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
                      onClick={() => handleAppointmentClick(appointment)}
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
                        {getStatusBadge(appointment.status)}
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
  }

  // ============ RENDER CLIENT DETAIL VIEW ============
  if (currentView === 'clientDetail' && selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <button
              onClick={goBack}
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
                      {clientData.clientAppointments?.map((ca) => (
                        <tr
                          key={ca.email}
                          onClick={() => handleClientEmailClick(ca.email)}
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
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              {ca.confirmed}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                              {ca.cancelled}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </td>
                        </tr>
                      ))}
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
  }

  // ============ RENDER MAIN DASHBOARD VIEW ============
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
                onClick={handleFetchAll}
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
                onClick={() => setShowWizard(true)}
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
                onClick={() => setShowWizard(true)}
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
                  onClick={() => handleClientClick(client.id)}
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
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          <span>
                            {client.stats?.lastFetch
                              ? new Date(client.stats.lastFetch).toLocaleDateString()
                              : 'Never synced'}
                          </span>
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

      {/* Setup Wizard Modal */}
      {showWizard && (
        <SetupWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
