// src/pages/_RoleShell.tsx
export default function RoleShell({ letter, label }: { letter: string; label: string }) {
  return (
    <div style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#0f172a',color:'#e2e8f0'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'22rem',lineHeight:1,fontWeight:900,letterSpacing:'-0.06em'}}>{letter}</div>
        <div style={{marginTop:'-4rem',fontSize:'2rem',opacity:.8}}>{label}</div>
      </div>
    </div>
  );
}
