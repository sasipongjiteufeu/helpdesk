const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function Login() {
  return (
    <div style={{minHeight:'100dvh',display:'grid',placeItems:'center'}}>
      <button onClick={() => (window.location.href = `${API_BASE}/auth/google`)}>
        Continue with Google
      </button>
    </div>
  );
}
