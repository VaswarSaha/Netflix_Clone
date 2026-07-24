export const API_KEY = 'e950e51d5d49e85f7c2f17f01eb23ba3';
export const BASE_URL = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p/original';
export const IMG_SMALL = 'https://image.tmdb.org/t/p/w500';

const apiCache = new Map();

export async function fetchWithCache(endpoint) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
  if (apiCache.has(url)) return apiCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  apiCache.set(url, data.results || []);
  return data.results || [];
}