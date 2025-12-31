import appointmentsRoutes from "../services/appointments.routes.js";
import leadsRoutes from "../services/leads.routes.js";
import clientsRoutes from "../services/clients.routes.js";
import compareRoutes from "../services/compare.routes.js";

export default function registerRoutes(app) {
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/leads", leadsRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/compare", compareRoutes);
}
