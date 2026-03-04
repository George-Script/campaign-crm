// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter your email and password');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back 🔥');
      // DefaultRedirect in App.jsx handles where they go
      navigate('/');
    } catch {
      toast.error('Wrong email or password. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
      background:'var(--bg-base)',
      backgroundImage:`
        radial-gradient(ellipse 70% 55% at 50% -5%, rgba(240,165,0,.07), transparent),
        radial-gradient(ellipse 40% 30% at 85% 85%, rgba(0,208,132,.05), transparent)
      `,
    }}>
      {/* grid texture */}
      <div style={{
        position:'fixed', inset:0, opacity:.025, pointerEvents:'none',
        backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
        backgroundSize:'44px 44px',
      }}/>

      <div className="fade-up" style={{ width:'100%', maxWidth:400 }}>

        {/* ── Brand ────────────────────────────────────── */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:54, height:54, borderRadius:16, margin:'0 auto 14px',
            background:'linear-gradient(135deg,var(--gold),var(--gold-dim))',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 28px rgba(240,165,0,.32)',
          }}>
            <Zap size={24} color="#080C12" strokeWidth={2.5}/>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, letterSpacing:'-.02em' }}>
            SPETS CRM
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:6 }}>
            Campaign Command Centre
          </p>
        </div>

        {/* ── Card ─────────────────────────────────────── */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:20, padding:'30px 28px',
          boxShadow:'0 20px 60px rgba(0,0,0,.5)',
        }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, marginBottom:22 }}>
            Sign in to continue
          </h2>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label>Email Address</label>
              <div style={{ position:'relative' }}>
                <Mail size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} style={{ paddingLeft:34 }} required />
              </div>
            </div>

            <div>
              <label>Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft:34, paddingRight:36 }} required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2 }}>
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            <button className="btn btn-gold" type="submit" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'12px', marginTop:4 }}>
              {loading ? 'Signing in…' : '→ Enter Command Centre'}
            </button>
          </form>

          <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, marginTop:18 }}>
            No account? Ask your campaign admin.
          </p>
        </div>
      </div>
    </div>
  );
}