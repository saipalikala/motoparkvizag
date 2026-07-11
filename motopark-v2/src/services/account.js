/**
 * services/account.js — authed profile + saved-address ops (V1 backend).
 * All require a Bearer token (attached by the api interceptor). Address ops
 * return the updated savedAddresses array.
 */
import { api } from '@/lib/api.js';

export async function updateProfile({ name, phone }) {
  const { data } = await api.put('/users/profile', { name, phone });
  return data.user;
}

export async function saveAddress(address) {
  const { data } = await api.post('/users/addresses', address);
  return data.user?.savedAddresses ?? [];
}

export async function deleteAddress(addressId) {
  const { data } = await api.delete(`/users/addresses/${addressId}`);
  return data.user?.savedAddresses ?? [];
}
