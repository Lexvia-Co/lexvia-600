export const TRIP_PURPOSES = { holiday: "旅游度假", visit: "探亲访友" } as const;
export type TripPurpose = keyof typeof TRIP_PURPOSES;

export function isTripPurpose(value: unknown): value is TripPurpose {
  return value === "holiday" || value === "visit";
}
