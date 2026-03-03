// src/pages/AdminDashboard.jsx
// ─────────────────────────────────────────────────────────
// Admin-only analytics. Shows live data across all members.
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PROGRAMMES, LEVELS, CHART_COLOURS } from '../constants';
import {
  Users, Star, Heart, TrendingUp, BarChart2,
  Activity, Award, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

// ── Tooltip ──────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:12, color:p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, sub, accent='gold' }) {
  const cols = { gold:'var(--gold)', green:'var(--green)', blue:'var(--blue)', purple:'var(--purple)', red:'var(--red)' };
  const c = cols[accent] || cols.gold;
  return (
    <div className="card" style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-18, right:-18, width:72, height:72, borderRadius:'50%', background:c, opacity:.06 }}/>
      <div style={{ padding:8, borderRadius:10, background:`${c}18`, width:'fit-content', marginBottom:12 }}>
        <Icon size={17} color={c}/>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:800, color:c, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginTop:6 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon:Icon, colour, children }) {
  return (
    <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'30px 0 14px', display:'flex', alignItems:'center', gap:8 }}>
      <Icon size={16} color={colour}/> {children}
    </h2>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('dateAdded', 'desc'));
    return onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const s = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);

    const total      = contacts.length;
    const strong     = contacts.filter(c => c.supportLevel === 'Strong').length;
    const volunteers = contacts.filter(c => c.volunteer).length;
    const todayCount = contacts.filter(c => {
      if (!c.dateAdded) return false;
      const d = c.dateAdded.toDate ? c.dateAdded.toDate() : new Date(c.dateAdded);
      return d >= today;
    }).length;

    const byProgramme = PROGRAMMES.map(p => ({
      name: p, count: contacts.filter(c => c.programme === p).length,
    }));

    const byLevel = LEVELS.map(l => ({
      name: `Lvl ${l}`, count: contacts.filter(c => c.level === l).length,
    }));

    const statusMap = {};
    contacts.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
    const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const hostelMap = {};
    contacts.forEach(c => { if (c.hostel) hostelMap[c.hostel] = (hostelMap[c.hostel] || 0) + 1; });
    const byHostel = Object.entries(hostelMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, count]) => ({ name, count }));

    const memberMap = {};
    contacts.forEach(c => {
      const k = c.assignedTo;
      if (!memberMap[k]) memberMap[k] = { name: c.assignedToName || 'Unknown', contacts:0, strong:0, volunteers:0 };
      memberMap[k].contacts++;
      if (c.supportLevel === 'Strong') memberMap[k].strong++;
      if (c.volunteer) memberMap[k].volunteers++;
    });
    const byMember = Object.values(memberMap).sort((a,b) => b.contacts - a.contacts);

    return { total, strong, volunteers, todayCount, byProgramme, byLevel, byStatus, byHostel, byMember };
  }, [contacts]);

  if (loading) return (
    <div className="page">
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:120, borderRadius:14 }}/>)}
      </div>
    </div>
  );

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Dashboard</h1>
          <p className="page-subtitle">Live intelligence across all team members</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
            style={{ gap:6 }}
          >
            <span style={{ fontSize:13 }}>⬇</span> Export PDF
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 13px', background:'var(--green-glow)', border:'1px solid rgba(0,208,132,.2)', borderRadius:20 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>Live</span>
          </div>
        </div>
      </div>

      {/* ── Top stats ──────────────────────────────────── */}
      <div className="grid-4">
        <StatCard icon={Users}      label="Total Contacts"   value={s.total}      sub="All team contacts"                                   accent="blue"  />
        <StatCard icon={Star}       label="Strong Supporters" value={s.strong}    sub={`${s.total ? Math.round(s.strong/s.total*100) : 0}% of total`} accent="gold"  />
        <StatCard icon={Heart}      label="Volunteers"        value={s.volunteers} sub="Committed to help"                                  accent="green" />
        <StatCard icon={TrendingUp} label="Added Today"       value={s.todayCount} sub="New contacts"                                       accent="purple"/>
      </div>

      {/* ── Programme intelligence ─────────────────────── */}
      <SectionTitle icon={BarChart2} colour="var(--gold)">Programme Intelligence</SectionTitle>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:14 }}>CONTACTS BY PROGRAMME</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={s.byProgramme} margin={{ left:-20, right:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fill:'var(--text-muted)', fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="count" name="Contacts" radius={[6,6,0,0]}>
                {s.byProgramme.map((_,i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:14 }}>STATUS BREAKDOWN</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={s.byStatus} cx="50%" cy="50%" outerRadius={78} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false} style={{ fontSize:10 }}>
                {s.byStatus.map((_,i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]}/>)}
              </Pie>
              <Tooltip content={<ChartTip/>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Level distribution ─────────────────────────── */}
      <SectionTitle icon={Target} colour="var(--green)">Level Distribution</SectionTitle>
      <div className="grid-4">
        {s.byLevel.map((l, i) => (
          <div key={l.name} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:800, color:CHART_COLOURS[i], lineHeight:1, marginBottom:4 }}>{l.count}</div>
            <div style={{ fontSize:13, fontWeight:600 }}>{l.name}</div>
            <div className="progress-track" style={{ marginTop:10 }}>
              <div className="progress-fill" style={{ width:`${s.total ? (l.count/s.total*100) : 0}%`, background:CHART_COLOURS[i] }}/>
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>
              {s.total ? Math.round(l.count/s.total*100) : 0}%
            </div>
          </div>
        ))}
      </div>

      {/* ── Hostel breakdown ───────────────────────────── */}
      {s.byHostel.length > 0 && (
        <>
          <SectionTitle icon={Activity} colour="var(--blue)">Hostel Breakdown</SectionTitle>
          <div className="card">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {s.byHostel.map((h, i) => (
                <div key={h.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:110, fontSize:13, color:'var(--text-primary)', fontWeight:500, flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.name}</div>
                  <div style={{ flex:1, height:22, background:'var(--bg-raised)', borderRadius:6, overflow:'hidden' }}>
                    <div style={{
                      height:'100%',
                      width:`${s.byHostel[0].count ? (h.count/s.byHostel[0].count*100) : 0}%`,
                      background:`linear-gradient(90deg,${CHART_COLOURS[i%CHART_COLOURS.length]},${CHART_COLOURS[(i+1)%CHART_COLOURS.length]})`,
                      borderRadius:6, transition:'width .6s ease',
                      display:'flex', alignItems:'center', paddingLeft:8,
                    }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#080C12' }}>{h.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Team performance ───────────────────────────── */}
      <SectionTitle icon={Award} colour="var(--purple)">Team Performance Board</SectionTitle>
      <div className="table-wrap" style={{ marginBottom:32 }}>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Member</th>
              <th>Contacts</th>
              <th>Strong</th>
              <th>Volunteers</th>
              <th>Strong Rate</th>
            </tr>
          </thead>
          <tbody>
            {s.byMember.map((m, i) => (
              <tr key={m.name}>
                <td style={{ color: i===0 ? 'var(--gold)' : 'var(--text-muted)', fontWeight:700, fontSize:15 }}>
                  {i===0 ? '🏆' : `#${i+1}`}
                </td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${CHART_COLOURS[i%CHART_COLOURS.length]},${CHART_COLOURS[(i+2)%CHART_COLOURS.length]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight:600 }}>{m.name}</span>
                  </div>
                </td>
                <td><span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--blue)' }}>{m.contacts}</span></td>
                <td><span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--gold)' }}>{m.strong}</span></td>
                <td><span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--green)' }}>{m.volunteers}</span></td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div className="progress-track" style={{ width:60, height:6 }}>
                      <div className="progress-fill" style={{ width:`${m.contacts ? m.strong/m.contacts*100 : 0}%`, background:'var(--gold)' }}/>
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{m.contacts ? Math.round(m.strong/m.contacts*100) : 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {s.byMember.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:'30px' }}>No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}