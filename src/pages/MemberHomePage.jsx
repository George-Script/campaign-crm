// src/pages/MemberHomePage.jsx
// ─────────────────────────────────────────────────────────
// What members see when they log in:
//   1. Greeting with their name
//   2. Personal stats: contacts, strong supporters, volunteers
//   3. Target progress bars (goals set in constants.js)
//   4. Motivational status message based on progress
//   5. Their 5 most recent contacts
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MEMBER_TARGETS, STATUS_BADGE } from '../constants';
import { UserPlus, Target, Users, Star, Heart, MessageCircle, ChevronRight, Flame, Trophy, Zap } from 'lucide-react';
import { Avatar } from '../component/AppLayout';

// ── Progress ring (SVG) ─────────────────────────────────
function ProgressRing({ pct, colour, size = 80, stroke = 6 }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-raised)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

// ── Target card ─────────────────────────────────────────
function TargetCard({ label, current, goal, colour, icon: Icon, note }) {
  const pct  = Math.min(Math.round((current / goal) * 100), 100);
  const done = current >= goal;

  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ padding:7, borderRadius:9, background:`${colour}18` }}>
            <Icon size={15} color={colour} />
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{label}</span>
        </div>
        {done && <span className="badge badge-green" style={{ fontSize:10 }}>✓ Done!</span>}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <ProgressRing pct={pct} colour={done ? 'var(--green)' : colour} />
          <div style={{
            position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-display)', color: done ? 'var(--green)' : colour }}>
              {pct}%
            </span>
          </div>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', color: colour }}>
              {current}
            </span>
            <span style={{ fontSize:13, color:'var(--text-muted)', alignSelf:'flex-end', paddingBottom:4 }}>
              / {goal} goal
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${pct}%`, background: done ? 'var(--green)' : colour }} />
          </div>
          {note && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{note}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Motivation message ──────────────────────────────────
function getMotivation(contactPct, strongPct) {
  const avg = (contactPct + strongPct) / 2;
  if (avg >= 100) return { icon: Trophy,  colour:'var(--gold)',   text:"You've crushed every target. Absolute legend. 🏆" };
  if (avg >= 75)  return { icon: Flame,   colour:'var(--red)',    text:"You're on fire — don't slow down now. The finish line is close." };
  if (avg >= 50)  return { icon: Zap,     colour:'var(--blue)',   text:"Solid halfway mark. Keep the momentum going every day." };
  if (avg >= 25)  return { icon: Target,  colour:'var(--purple)', text:"Good start. Every conversation counts — stay consistent." };
  return              { icon: Zap,     colour:'var(--text-secondary)', text:"Let's get moving. Your first 10 contacts are the hardest — after that it flows." };
}

// ── Recent contacts mini-row ────────────────────────────
function RecentRow({ contact, idx }) {
  const col = ['#F0A500','#00D084','#3B82F6','#8B5CF6','#FF4D6D'][idx % 5];
  const badgeType = STATUS_BADGE[contact.status] || 'gray';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <Avatar name={contact.fullName} index={idx} size={32} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13 }}>{contact.fullName}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>
          {contact.programme || '—'} · Lvl {contact.level || '—'} · {contact.hostel || '—'}
        </div>
      </div>
      <span className={`badge badge-${badgeType}`} style={{ fontSize:10, flexShrink:0 }}>{contact.status}</span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────
export default function MemberHomePage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [myContacts, setMyContacts] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'contacts'),
      where('assignedTo', '==', currentUser.uid),
      orderBy('dateAdded', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setMyContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const stats = useMemo(() => {
    const total     = myContacts.length;
    const strong    = myContacts.filter(c => c.supportLevel === 'Strong').length;
    const volunteers= myContacts.filter(c => c.volunteer).length;
    const responded = myContacts.filter(c => ['Responded','Volunteer'].includes(c.status)).length;
    return { total, strong, volunteers, responded };
  }, [myContacts]);

  const contactPct  = Math.min(Math.round(stats.total    / MEMBER_TARGETS.contacts  * 100), 100);
  const strongPct   = Math.min(Math.round(stats.strong   / MEMBER_TARGETS.strong    * 100), 100);
  const volunteerPct= Math.min(Math.round(stats.volunteers/MEMBER_TARGETS.volunteers * 100), 100);

  const motivation  = getMotivation(contactPct, strongPct);
  const MotIcon     = motivation.icon;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = userProfile?.name?.split(' ')[0] || 'there';

  const recentFive = myContacts.slice(0, 5);

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height:80, borderRadius:14, marginBottom:20 }}/>
      <div className="grid-3">
        {[...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height:160, borderRadius:14 }}/>)}
      </div>
    </div>
  );

  return (
    <div className="page fade-up">

      {/* ── Greeting ─────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 className="page-title">{greeting}, {firstName} 👋</h1>
            <p className="page-subtitle">Here's how your campaign effort is looking today.</p>
          </div>
          <button className="btn btn-gold" onClick={() => navigate('/add-contact')}>
            <UserPlus size={15}/> Add Contact
          </button>
        </div>
      </div>

      {/* ── Personal Stats Row ───────────────────────── */}
      <div className="grid-3" style={{ marginBottom:8 }}>
        <StatPill icon={Users}  colour="var(--blue)"   label="My Contacts"   value={stats.total}      />
        <StatPill icon={Star}   colour="var(--gold)"   label="Strong Support" value={stats.strong}    />
        <StatPill icon={Heart}  colour="var(--green)"  label="Volunteers"     value={stats.volunteers} />
      </div>

      {/* ── Motivation banner ────────────────────────── */}
      <div style={{
        margin:'20px 0',
        padding:'14px 18px',
        borderRadius:12,
        background:`${motivation.colour}0D`,
        border:`1px solid ${motivation.colour}30`,
        display:'flex', alignItems:'center', gap:12,
      }}>
        <MotIcon size={18} color={motivation.colour} style={{ flexShrink:0 }}/>
        <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5 }}>
          {motivation.text}
        </p>
      </div>

      {/* ── Target Progress ──────────────────────────── */}
      <div className="section-title">
        <Target size={16} style={{ color:'var(--gold)' }}/> Your Targets
      </div>
      <div className="grid-3">
        <TargetCard
          label="Total Contacts"
          current={stats.total}
          goal={MEMBER_TARGETS.contacts}
          colour="var(--blue)"
          icon={Users}
          note={`${MEMBER_TARGETS.contacts - stats.total > 0 ? `${MEMBER_TARGETS.contacts - stats.total} more to go` : 'Target smashed!'}`}
        />
        <TargetCard
          label="Strong Supporters"
          current={stats.strong}
          goal={MEMBER_TARGETS.strong}
          colour="var(--gold)"
          icon={Star}
          note="Focus on quality conversations"
        />
        <TargetCard
          label="Volunteers Secured"
          current={stats.volunteers}
          goal={MEMBER_TARGETS.volunteers}
          colour="var(--green)"
          icon={Heart}
          note="Every volunteer multiplies your reach"
        />
      </div>

      {/* ── Tips ─────────────────────────────────────── */}
      <TipsBar contactPct={contactPct} />

      {/* ── Recent Contacts ──────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:28, marginBottom:14 }}>
        <div className="section-title" style={{ marginTop:0, marginBottom:0 }}>
          <Users size={16} style={{ color:'var(--blue)' }}/> Recent Contacts
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contacts')}>
          View All <ChevronRight size={13}/>
        </button>
      </div>

      {recentFive.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'40px 20px' }}>
          <Users size={36} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }}/>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>No contacts yet.</p>
          <button className="btn btn-gold btn-sm" style={{ marginTop:14 }} onClick={() => navigate('/add-contact')}>
            <UserPlus size={13}/> Add Your First Contact
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding:'4px 16px 0' }}>
          {recentFive.map((c, i) => <RecentRow key={c.id} contact={c} idx={i} />)}
          <div style={{ padding:'10px 0' }}>
            <button className="btn btn-outline btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={() => navigate('/contacts')}>
              See All My Contacts <ChevronRight size={13}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────
function StatPill({ icon: Icon, colour, label, value }) {
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px' }}>
      <div style={{ padding:9, borderRadius:10, background:`${colour}18`, flexShrink:0 }}>
        <Icon size={17} color={colour}/>
      </div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color: colour, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>{label}</div>
      </div>
    </div>
  );
}

function TipsBar({ contactPct }) {
  // Show different tips based on progress
  const tips = contactPct < 30
    ? ["Hit lectures at peak hours — before 8am and after 4pm.", "Start with your own department — warm introductions first."]
    : contactPct < 70
    ? ["Ask every contact: 'Do you know anyone else who might support us?'", "Follow up 'Not Contacted' people every 2 days."]
    : ["Push for volunteers — they each recruit 3–5 more people.", "Revisit Neutral contacts and move them to Leaning."];

  return (
    <div style={{ marginTop:20, padding:'14px 16px', borderRadius:12, background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:8 }}>
        💡 FIELD TIPS FOR YOU RIGHT NOW
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {tips.map((t, i) => (
          <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text-secondary)' }}>
            <span style={{ color:'var(--gold)', flexShrink:0 }}>→</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}