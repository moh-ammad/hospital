import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SetupWizard from '../components/SetupWizard';
import { clientApi, fetchAll, compareApi } from '../services/api';
import DashboardView from '../components/dashboard/DashboardView';
import ClientDetailView from '../components/dashboard/ClientDetailView';
import EmailAppointmentsView from '../components/dashboard/EmailAppointmentsView';
import AppointmentDetailView from '../components/dashboard/AppointmentDetailView';
import { formatDate, getStatusBadgeData } from '../utils/dashboardUtils';

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

  const navigateTo = (view, data = {}) => {
    setNavigationStack([...navigationStack, { view: currentView, data: { selectedClient, selectedClientEmail, selectedAppointment, clientData } }]);
    setCurrentView(view);
    
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

  // ============ RENDER VIEWS ============
  if (currentView === 'appointmentDetail' && selectedAppointment) {
    return (
      <AppointmentDetailView
        appointment={selectedAppointment}
        onBack={goBack}
        formatDate={formatDate}
      />
    );
  }

  if (currentView === 'emailAppointments' && selectedClientEmail) {
    return (
      <EmailAppointmentsView
        selectedClientEmail={selectedClientEmail}
        onBack={goBack}
        onAppointmentClick={handleAppointmentClick}
        formatDate={formatDate}
        getStatusBadge={getStatusBadgeData}
      />
    );
  }

  if (currentView === 'clientDetail' && selectedClient) {
    return (
      <ClientDetailView
        selectedClient={selectedClient}
        clientData={clientData}
        clientDataLoading={clientDataLoading}
        onBack={goBack}
        onClientEmailClick={handleClientEmailClick}
      />
    );
  }

  return (
    <>
      <DashboardView
        loading={loading}
        fetching={fetching}
        clients={clients}
        stats={stats}
        onFetchAll={handleFetchAll}
        onAddClient={() => setShowWizard(true)}
        onClientClick={handleClientClick}
      />

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
    </>
  );
};

export default Dashboard;
