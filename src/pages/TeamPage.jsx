// src/pages/TeamPage.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, UserPlus, Mail, Eye, EyeOff } from 'lucide-react';
import { Avatar } from '../component/AppLayout';
import toast from 'react-hot-toast';

const BLANK = { name:'', email:'', password:'', role:'Member' };

export default function TeamPage() {
  const { registerMember } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(BLANK);
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'teamMembers'), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    if (form.password.length < 6) return toast.error('Password needs at least 6 characters');
    setSaving(true);
    try {
      await registerMember(form.email, form.password, form.name, form.role);
      toast.success(`${form.name} added to the team! 🎉`);
      setForm(BLANK);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error('That email is already registered');
      else toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Create accounts for campaign team members</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 13px', background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.2)', borderRadius:20 }}>
          <Shield size={13} color="var(--purple)"/>
          <span style={{ fontSize:12, color:'var(--purple)', fontWeight:600 }}>Admin Only</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems:'flex-start' }}>

        {/* ── Add member form ─────────────────────────── */}
        <div className="card">
          <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--gold)', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            <UserPlus size={15}/> Add Team Member
          </div>
          <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label>Full Name</label>
              <input type='text' placeholder="Kofi Mensah" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required/>
            </div>
            <div>
              <label>Email Address</label>
              <div style={{ position:'relative' }}>
                <Mail size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input type="email" placeholder="member@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ paddingLeft:34 }} required/>
              </div>
            </div>
            <div>
              <label>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight:36 }} required minLength={6}/>
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2 }}>
                  {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              </div>
            </div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-gold" disabled={saving} style={{ justifyContent:'center' }}>
              <UserPlus size={14}/> {saving ? 'Adding…' : 'Add Member'}
            </button>
          </form>
        </div>

        {/* ── Current team ────────────────────────────── */}
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, marginBottom:14, color:'var(--text-primary)' }}>
            Current Team ({members.length})
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height:68, borderRadius:12 }}/>)}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {members.sort((a,b) => {
                if (a.role === 'Admin' && b.role !== 'Admin') return -1;
                if (b.role === 'Admin' && a.role !== 'Admin') return 1;
                return (a.name||'').localeCompare(b.name||'');
              }).map((m, i) => (
                <div key={m.id} className="card" style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                  <Avatar name={m.name} index={i} size={40}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</div>
                  </div>
                  <span className={`badge ${m.role==='Admin' ? 'badge-gold' : 'badge-blue'}`} style={{ flexShrink:0 }}>
                    {m.role}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <div className="card" style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-muted)' }}>
                  No members yet. Add your first one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}