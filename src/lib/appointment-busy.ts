// Qué citas ocupan un horario. Una cita sin tipo (apartada a mano) no pertenece a ninguna agenda,
// así que bloquea el horario en todos los tipos de cita de su organización.

type Scope = { organizationId: string } & ({ scheduleId: string; appointmentTypeId?: never } | { appointmentTypeId: string; scheduleId?: never });

/** Filtro de Prisma para las citas que ocupan tiempo en una agenda (o en un tipo) más las citas sin tipo. */
export function busyAppointmentsWhere(scope: Scope) {
  const own = scope.scheduleId !== undefined ? { appointmentType: { scheduleId: scope.scheduleId } } : { appointmentTypeId: scope.appointmentTypeId };
  return { OR: [own, { appointmentTypeId: null, organizationId: scope.organizationId }] };
}
