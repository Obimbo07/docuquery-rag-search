// Backend API URL configuration
// In development, the backend runs on port 4000
// In production, this should be set to your deployed backend URL
export const backendUrl = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com' 
  : 'http://localhost:4000';
