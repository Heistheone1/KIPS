import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const deleteNotification = (id) => async () => {
  const csrfResponse = await api.get('/api/auth/csrf-token');

  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfResponse.data.csrfToken,
    },
  });

  const response = await client.delete(`/api/notifications/${id}`);
  return response.data;
};