export const BASE_URL = 'https://deployment-4xwq.onrender.com/';

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