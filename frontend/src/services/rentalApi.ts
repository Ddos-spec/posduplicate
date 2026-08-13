import api from './api';

export const rentalApi = {
  items: async () => (await api.get('/rental/items')).data.data,
  saveItem: async (payload: Record<string, unknown>) => (await api.put('/rental/items', payload)).data.data,
  availability: async (itemId: number, startsAt: string, endsAt: string) =>
    (await api.get(`/rental/items/${itemId}/availability`, { params: { startsAt, endsAt } })).data.data,
  bookings: async () => (await api.get('/rental/bookings')).data.data,
  createBooking: async (payload: Record<string, unknown>) => (await api.post('/rental/bookings', payload)).data.data,
  setBookingStatus: async (id: number, status: string) => (await api.patch(`/rental/bookings/${id}/status`, { status })).data.data,
  holdDeposit: async (id: number, payload: { paymentMethod: string; referenceNumber?: string }) =>
    (await api.post(`/rental/bookings/${id}/deposit/hold`, payload)).data.data,
  releaseDeposit: async (id: number) =>
    (await api.post(`/rental/bookings/${id}/deposit/release`)).data.data,
};
