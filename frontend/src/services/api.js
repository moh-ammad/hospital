import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// ------------------------------------------------------------
// Request de-dupe + light caching (prevents StrictMode + nested-page refetch spam)
// ------------------------------------------------------------

const inFlightRequests = new Map();
const responseCache = new Map();

const now = () => Date.now();

function safeErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.statusText ||
    error?.message ||
    String(error)
  );
}

function logError(context, error) {
  // Centralized fallback logging (requested)
  console.error(`[api] ${context}:`, safeErrorMessage(error), error);
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs) {
  responseCache.set(key, {
    value,
    expiresAt: typeof ttlMs === 'number' ? now() + ttlMs : null,
  });
}

async function dedupeRequest({ key, ttlMs, shouldCache }, fn) {
  const cached = getCached(key);
  if (cached) return cached;

  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await fn();
      if (shouldCache?.(value)) {
        setCached(key, value, ttlMs);
      }
      return value;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout
});

// Add retry logic with exponential backoff
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Don't retry if we've exceeded max retries
    if (!config || config.__retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    config.__retryCount++;

    // Retry on network errors or 5xx errors
    const shouldRetry = 
      !error.response || 
      error.response.status >= 500 ||
      error.response.status === 429;

    if (shouldRetry) {
      const delayMs = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
      await sleep(delayMs);
      return api(config);
    }

    return Promise.reject(error);
  }
);

// Helper to handle API errors
const handleError = (error) => {
  if (error.response) {
    // Server responded with error
    return {
      success: false,
      error: error.response.data?.error || error.response.statusText || 'Server error',
      status: error.response.status
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      error: 'No response from server. Please check your connection.',
      status: 0
    };
  } else {
    // Request setup error
    return {
      success: false,
      error: error.message || 'Request failed',
      status: 0
    };
  }
};

// Client APIs
export const clientApi = {
  // Get all clients
  getAll: async () => {
    try {
      // cache briefly to avoid StrictMode double-fetch + rapid navigation spam
      return await dedupeRequest(
        {
          key: 'clients:getAll',
          ttlMs: 5000,
          shouldCache: (v) => v?.success === true,
        },
        async () => {
          const response = await api.get('/clients');
          return response.data;
        }
      );
    } catch (error) {
      logError('clientApi.getAll failed', error);
      return handleError(error);
    }
  },

  // Create new client
  create: async (clientData) => {
    try {
      const response = await api.post('/clients', clientData);
      return response.data;
    } catch (error) {
      logError('clientApi.create failed', error);
      return handleError(error);
    }
  },

  // Update IntakeQ credentials
  updateIntakeQ: async (clientId, credentials) => {
    try {
      const response = await api.post(`/clients/${clientId}/intakeq`, credentials);
      return response.data;
    } catch (error) {
      logError('clientApi.updateIntakeQ failed', error);
      return handleError(error);
    }
  },

  // Update VTiger credentials
  updateVTiger: async (clientId, credentials) => {
    try {
      const response = await api.post(`/clients/${clientId}/vtiger`, credentials);
      return response.data;
    } catch (error) {
      logError('clientApi.updateVTiger failed', error);
      return handleError(error);
    }
  },

  // Get client appointments
  getAppointments: async (clientId, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/clients/${clientId}/appointments`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      logError('clientApi.getAppointments failed', error);
      return handleError(error);
    }
  },

  // Get client leads
  getLeads: async (clientId, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/clients/${clientId}/leads`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      logError('clientApi.getLeads failed', error);
      return handleError(error);
    }
  },
};

// Appointment APIs
export const appointmentApi = {
  // Sync appointments
  sync: async (clientId, clientName, apiKey, apiUrl, range = 'all') => {
    try {
      const response = await api.post('/appointments/sync', {
        clientId,
        clientName,
        apiKey,
        apiUrl,
        range
      });
      return response.data;
    } catch (error) {
      logError('appointmentApi.sync failed', error);
      return handleError(error);
    }
  },

  // Get all appointments for a client
  getAll: async (clientName) => {
    try {
      const response = await api.get(`/appointments/all/${clientName}`);
      return response.data;
    } catch (error) {
      logError('appointmentApi.getAll failed', error);
      return handleError(error);
    }
  },
};

// Lead APIs
export const leadApi = {
  // Sync leads
  sync: async (clientId, clientName) => {
    try {
      const response = await api.post('/leads/sync', {
        clientId,
        clientName
      });
      return response.data;
    } catch (error) {
      logError('leadApi.sync failed', error);
      return handleError(error);
    }
  },

  // Get all leads for a client
  getAll: async (clientName) => {
    try {
      const response = await api.get(`/leads/all/${clientName}`);
      return response.data;
    } catch (error) {
      logError('leadApi.getAll failed', error);
      return handleError(error);
    }
  },
};

// Compare API
export const compareApi = {
  // Read-only compare (no VTiger updates) - for UI navigation
  get: async (clientId, options = {}) => {
    const { force = false } = options;
    const key = `compare:get:${clientId}`;

    if (!force) {
      const cached = getCached(key);
      if (cached) return cached;
    }

    try {
      return await dedupeRequest(
        {
          key,
          ttlMs: 5 * 60 * 1000, // 5 minutes
          shouldCache: (v) => v?.success === true,
        },
        async () => {
          const response = await api.get(`/compare/${clientId}`);
          return response.data;
        }
      );
    } catch (error) {
      logError('compareApi.get failed', error);
      return handleError(error);
    }
  },

  // Compare and sync appointments with leads
  sync: async (clientId, clientName, options = {}) => {
    const { force = false } = options;
    const key = `compare:sync:${clientId || clientName || ''}`;

    if (!force) {
      const cached = getCached(key);
      if (cached) return cached;
    }

    try {
      // Cache for a while so nested pages don't keep re-triggering VTiger updates.
      return await dedupeRequest(
        {
          key,
          ttlMs: 10 * 60 * 1000, // 10 minutes
          shouldCache: (v) => v?.success === true,
        },
        async () => {
          const response = await api.post('/compare/sync', {
            clientId,
            clientName,
          });
          return response.data;
        }
      );
    } catch (error) {
      logError('compareApi.sync failed', error);
      return handleError(error);
    }
  },
};

// Combined fetch operation
export const fetchAll = async (clientId, clientName) => {
  try {
    // Run all three operations in sequence (appointments -> leads -> compare)
    const appointmentsResult = await appointmentApi.sync(clientId, clientName);
    if (!appointmentsResult.success) {
      throw new Error(`Appointments sync failed: ${appointmentsResult.error}`);
    }

    // Wait a bit before next operation
    await sleep(2000);

    const leadsResult = await leadApi.sync(clientId, clientName);
    if (!leadsResult.success) {
      throw new Error(`Leads sync failed: ${leadsResult.error}`);
    }

    // Wait a bit before compare
    await sleep(2000);

    const compareResult = await compareApi.sync(clientId, clientName);
    if (!compareResult.success) {
      throw new Error(`Compare sync failed: ${compareResult.error}`);
    }

    return {
      success: true,
      data: {
        appointments: appointmentsResult,
        leads: leadsResult,
        compare: compareResult
      }
    };
  } catch (error) {
    logError('fetchAll failed', error);
    return {
      success: false,
      error: error.message || 'Fetch all failed'
    };
  }
};

export default api;
