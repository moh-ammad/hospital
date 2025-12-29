export function mapAppointment(a) {
  return {
    intakeQId: a.Id,
    clientName: a.ClientName,
    clientEmail: a.ClientEmail,
    clientPhone: a.ClientPhone,
    clientDateOfBirth: a.ClientDateOfBirth,
    intakeQClientId: a.ClientId,

    status: a.Status,
    startDate: a.StartDate,
    endDate: a.EndDate,
    duration: a.Duration,
    serviceName: a.ServiceName,
    serviceId: a.ServiceId,
    locationName: a.LocationName,
    locationId: a.LocationId,
    price: a.Price,

    practitionerName: a.PractitionerName,
    practitionerEmail: a.PractitionerEmail,
    practitionerId: a.PractitionerId,

    startDateIso: a.StartDateIso,
    endDateIso: a.EndDateIso,
    startDateLocal: a.StartDateLocal,
    endDateLocal: a.EndDateLocal,
    startDateLocalFormatted: a.StartDateLocalFormatted,

    telehealthInfo: a.TelehealthInfo,
    intakeId: a.IntakeId,
    dateCreated: a.DateCreated,
    createdBy: a.CreatedBy,
    bookedByClient: a.BookedByClient,
    lastModified: a.LastModified,

    attendanceConfirmationResponse: a.AttendanceConfirmationResponse,
    reminderType: a.ReminderType,
    placeOfService: a.PlaceOfService,

    fullCancellationReason: a.FullCancellationReason,
    cancellationReasonNote: a.CancellationReasonNote,
    cancellationDate: a.CancellationDate,

    customFields: a.CustomFields,
    additionalClients: a.AdditionalClients,
    rawData: a
  };
}
