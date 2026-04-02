import axios from 'axios';
import { createAIFetch } from './interceptors';

// Base URL
const PROXY_API = `${PROXY_API_URL}`;

// For AI
const aiRequest = axios.create({
  baseURL: `${PROXY_API}`,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '-1',
  },
});

// Enhanced fetch for streaming requests with automatic token management
const aiFetch = createAIFetch();

export { PROXY_API, aiRequest, aiFetch };
