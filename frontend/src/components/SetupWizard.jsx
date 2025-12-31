import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientApi, appointmentApi, leadApi, compareApi } from '../services/api';

const SetupWizard = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(null);

  // Step 1: IntakeQ Configuration
  const [intakeQData, setIntakeQData] = useState({
    clientName: '',
    apiKey: '',
    apiUrl: 'https://intakeq.com/api/v1/appointments',
  });

  // Step 2: VTiger Configuration
  const [vtigerData, setVtigerData] = useState({
    vtigerUrl: '',
    vtigerUsername: '',
    vtigerAccessKey: '',
  });

  if (!isOpen) return null;

  const testIntakeQConnection = async () => {
    setLoading(true);
    try {
      // Create client first
      const createResult = await clientApi.create({
        name: intakeQData.clientName,
        intakeQKey: intakeQData.apiKey,
        intakeQBaseUrl: intakeQData.apiUrl.replace('/appointments', ''),
      });

      if (!createResult.success) {
        toast.error(createResult.error || 'Failed to create client');
        return;
      }

      setClientId(createResult.client.id);
      toast.success('IntakeQ connection successful!');
      setStep(2);
    } catch (error) {
      console.error('IntakeQ connection test failed:', error);
      toast.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const testVtigerConnection = async () => {
    if (!clientId) {
      toast.error('Client ID missing');
      return;
    }

    setLoading(true);
    try {
      const result = await clientApi.updateVTiger(clientId, vtigerData);

      if (!result.success) {
        toast.error(result.error || 'Failed to update VTiger credentials');
        return;
      }

      toast.success('VTiger connection successful!');
      setStep(3);
    } catch (error) {
      console.error('VTiger connection test failed:', error);
      toast.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      // Sync appointments
      toast.loading('Fetching appointments...', { id: 'fetch' });
      const appointmentsResult = await appointmentApi.sync(
        clientId,
        intakeQData.clientName,
        intakeQData.apiKey,
        intakeQData.apiUrl
      );

      if (!appointmentsResult.success) {
        throw new Error(appointmentsResult.error);
      }

      // Sync leads
      toast.loading('Fetching leads...', { id: 'fetch' });
      const leadsResult = await leadApi.sync(clientId, intakeQData.clientName);

      if (!leadsResult.success) {
        throw new Error(leadsResult.error);
      }

      // Compare data
      toast.loading('Comparing data...', { id: 'fetch' });
      const compareResult = await compareApi.sync(clientId, intakeQData.clientName);

      if (!compareResult.success) {
        throw new Error(compareResult.error);
      }

      toast.success('All data fetched successfully!', { id: 'fetch' });
      onComplete?.();
      handleClose();
    } catch (error) {
      toast.error(error.message || 'Fetch failed', { id: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIntakeQData({
      clientName: '',
      apiKey: '',
      apiUrl: 'https://intakeq.com/api/v1/appointments',
    });
    setVtigerData({
      vtigerUrl: '',
      vtigerUsername: '',
      vtigerAccessKey: '',
    });
    setClientId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">InteQ Setup Wizard</h2>
              <p className="text-indigo-100 text-sm mt-1">Connect your CRM and EMR to get started</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1 ? 'bg-white text-indigo-600' : 'bg-indigo-400 text-white'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">CRM Config</span>
            </div>

            <div className="flex-1 h-1 bg-indigo-400 mx-4">
              <div
                className={`h-full bg-white transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2 ? 'bg-white text-indigo-600' : 'bg-indigo-400 text-white'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">EMR Setup</span>
            </div>

            <div className="flex-1 h-1 bg-indigo-400 mx-4">
              <div
                className={`h-full bg-white transition-all ${step >= 3 ? 'w-full' : 'w-0'}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 3 ? 'bg-white text-indigo-600' : 'bg-indigo-400 text-white'
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: IntakeQ Configuration */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">CRM Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Pure Balance Medical"
                      value={intakeQData.clientName}
                      onChange={(e) =>
                        setIntakeQData({ ...intakeQData, clientName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CRM Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://dev.hcdcrm.com/webservice.php"
                      value={vtigerData.vtigerUrl}
                      onChange={(e) =>
                        setVtigerData({ ...vtigerData, vtigerUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="Your CRM username"
                      value={vtigerData.vtigerUsername}
                      onChange={(e) =>
                        setVtigerData({ ...vtigerData, vtigerUsername: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Key
                    </label>
                    <input
                      type="password"
                      placeholder="Your CRM access key (e.g., A3kD8nQ2mP7wRStY9)"
                      value={vtigerData.vtigerAccessKey}
                      onChange={(e) =>
                        setVtigerData({ ...vtigerData, vtigerAccessKey: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      Get this from VTiger: My Preferences → Access Key
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={testIntakeQConnection}
                  disabled={
                    loading ||
                    !intakeQData.clientName ||
                    !vtigerData.vtigerUrl ||
                    !vtigerData.vtigerUsername ||
                    !vtigerData.vtigerAccessKey
                  }
                  className="flex-1 bg-indigo-100 text-indigo-700 px-6 py-3 rounded-lg font-medium hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                <button
                  onClick={testIntakeQConnection}
                  disabled={
                    loading ||
                    !intakeQData.clientName ||
                    !vtigerData.vtigerUrl ||
                    !vtigerData.vtigerUsername ||
                    !vtigerData.vtigerAccessKey
                  }
                  className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: IntakeQ/EMR Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">EMR Setup</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IntakeQ API Key
                    </label>
                    <input
                      type="password"
                      placeholder="Your IntakeQ API key"
                      value={intakeQData.apiKey}
                      onChange={(e) =>
                        setIntakeQData({ ...intakeQData, apiKey: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://intakeq.com/api/v1/appointments"
                      value={intakeQData.apiUrl}
                      onChange={(e) =>
                        setIntakeQData({ ...intakeQData, apiUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  ← Back
                </button>

                <button
                  onClick={testVtigerConnection}
                  disabled={loading || !intakeQData.apiKey || !intakeQData.apiUrl}
                  className="flex-1 bg-indigo-100 text-indigo-700 px-6 py-3 rounded-lg font-medium hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                <button
                  onClick={testVtigerConnection}
                  disabled={loading || !intakeQData.apiKey || !intakeQData.apiUrl}
                  className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Configuration Complete!
                </h3>
                <p className="text-gray-600 mb-6">
                  Click below to fetch appointments and leads from both systems.
                </p>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-left space-y-2">
                  <h4 className="font-semibold text-indigo-900">What happens next:</h4>
                  <ul className="space-y-1 text-sm text-indigo-700">
                    <li>• Fetch all appointments from IntakeQ</li>
                    <li>• Fetch all leads from VTiger CRM</li>
                    <li>• Match appointments with leads by email</li>
                    <li>• Update VTiger with appointment statistics</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  ← Back
                </button>

                <button
                  onClick={fetchAllData}
                  disabled={loading}
                  className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Fetching Data...
                    </>
                  ) : (
                    'Fetch All Data'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;