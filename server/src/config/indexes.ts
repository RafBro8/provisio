import { Appointment } from "../models/Appointment";

export const BOOKING_INDEX_NAME = "providerId_1_startTime_1";

/**
 * Verifies the unique index that makes double-booking impossible actually
 * exists, and throws if it doesn't — so the server refuses to start rather
 * than run without its main correctness guarantee.
 *
 * This exists because that guarantee failed silently once. The Appointment
 * model was first created with a plain (non-unique) index on these fields
 * and made unique later. Mongoose won't alter an existing index that has the
 * same name: its background auto-indexing hits a conflict and swallows the
 * error. Any database that existed before the change kept the non-unique
 * index, with nothing to say so, and quietly accepted real double-bookings.
 *
 * Mongoose's own error handling isn't relied on here. The index state is
 * read back and checked directly, which is the only thing that matters.
 */
export async function assertBookingIndex(): Promise<void> {
  try {
    await Appointment.createIndexes();
  } catch {
    // A conflicting existing index makes this throw. The check below reports
    // that with a clearer, actionable message, so it's the source of truth.
  }

  const indexes = await Appointment.collection.indexes();
  const index = indexes.find((i) => i.name === BOOKING_INDEX_NAME);
  const isCorrect = index?.unique === true && index.partialFilterExpression?.status === "booked";

  if (!isCorrect) {
    const found = index
      ? `found it, but unique=${index.unique ?? false} and partialFilterExpression=${JSON.stringify(
          index.partialFilterExpression ?? null,
        )}`
      : "it doesn't exist";
    throw new Error(
      `Refusing to start: the "${BOOKING_INDEX_NAME}" index on appointments must be unique ` +
        `(scoped to status "booked") — ${found}. Without it, two customers can book the same slot. ` +
        `This usually means the index was created before it was made unique. To fix: resolve any ` +
        `duplicate booked appointments, run db.appointments.dropIndex("${BOOKING_INDEX_NAME}"), ` +
        `then restart and the correct index will be built.`,
    );
  }
}
