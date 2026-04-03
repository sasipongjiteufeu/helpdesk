export default function Forbidden() {
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  const msg =
    reason === 'unauthorized'
      ? 'You cannot access this app. (Unauthorized / not in allowed domain)'
      : 'You cannot access this app.';
  return (
    <div style={{minHeight:'100dvh',display:'grid',placeItems:'center',textAlign:'center'}}>
      <div>
        <h2>Access denied</h2>
        <p>{msg}</p>
      </div>
    </div>
  );
}
