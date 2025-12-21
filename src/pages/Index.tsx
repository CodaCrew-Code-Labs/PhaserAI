import { Navigate } from 'react-router-dom';

// Redirect to Landing page
export default function Index() {
  return <Navigate to="/" replace />;
}
