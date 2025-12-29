export function getClientConfig({ clientName, apiKey, apiUrl }) {
  if (!clientName || !apiKey || !apiUrl) {
    throw new Error("clientName, apiKey and apiUrl are required");
  }

  return {
    clientName: clientName.toLowerCase().replace(/\s+/g, "-"),
    apiKey,
    apiUrl
  };
}
