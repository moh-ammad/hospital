import appointmentsRoutes from "../services/appointments.routes.js";

export default function registerRoutes(app) {
  app.use("/api/appointments", appointmentsRoutes);
}
