export const BASE_URL = 'http://192.168.220.50:3001';

export const authFetch = async (url, token, options = {}) => {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
};