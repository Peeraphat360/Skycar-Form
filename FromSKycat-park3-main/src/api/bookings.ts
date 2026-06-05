import { apiFetch } from "./client";

// Submit a booking. The session cookie (if logged in) rides along via apiFetch,
// so the backend ties the booking to the authenticated LINE customer.
export async function submitBooking(bookingData: object) {
  return apiFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(bookingData),
  });
}

export async function getBookings() {
  return apiFetch("/api/bookings");
}
