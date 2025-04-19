// Fungsi helper untuk menangani response
const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const error = await response.json();
    throw new Error(error.message || 'Terjadi kesalahan');
  }
  return response;
};

// Fungsi utama untuk melakukan request API
export const apiFetch = async (endpoint, options = {}, customHeaders = {}) => {
  // Base URL berdasarkan environment
  const baseURL = import.meta.env.VITE_APP_ENV === 'production' 
    ? 'https://talinara.com/api'  // Production URL
    : 'http://localhost:8000/api'; // Development URL
    
  const token = localStorage.getItem('jwt_token');

  const defaultHeaders = {
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...customHeaders
  };

  // Jika ada body dalam format FormData, jangan set Content-Type
  if (!(options?.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers
    }
  };

  try {
    const response = await fetch(`${baseURL}${endpoint}`, config);
    return handleResponse(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};