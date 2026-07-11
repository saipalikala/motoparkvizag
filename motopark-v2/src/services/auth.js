/**
 * services/auth.js — V1 user auth (JWT Bearer). Endpoints return { token, user }.
 * Errors surface via the api interceptor as { code, message } (backend messages
 * like "Invalid email or password" pass through).
 */
import { api } from '@/lib/api.js';

export async function registerUser({ name, email, password }) {
  const { data } = await api.post('/users/register', { name, email, password });
  return { token: data.token, user: data.user };
}

export async function loginWithPassword({ email, password }) {
  const { data } = await api.post('/users/login/email', { email, password });
  return { token: data.token, user: data.user };
}

export async function sendLoginOtp(email) {
  const { data } = await api.post('/users/otp/send', { email });
  return data;
}

export async function verifyLoginOtp({ email, otp }) {
  const { data } = await api.post('/users/otp/verify', { email, otp });
  return { token: data.token, user: data.user };
}

/** Exchange a Google ID token (credential) for our app session. */
export async function loginWithGoogle(credential) {
  const { data } = await api.post('/users/auth/google', { credential });
  return { token: data.token, user: data.user };
}

export async function fetchProfile() {
  const { data } = await api.get('/users/profile');
  return data.user;
}
