// src/pages/CampaignJourneyPage.jsx
// ─────────────────────────────────────────────────────────
// The Campaign War Room. 4 tabs, 8 features, all live data.
//
// Tab 1 — WAR ROOM:  Countdown · Win Probability · Daily Missions
// Tab 2 — SCRIPTS:   Talking points per contact type
// Tab 3 — STRATEGY:  Canvassing Planner · Competitor Intel
// Tab 4 — EVENTS:    Rally Tracker · Referral Chain
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  doc, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { CHART_COLOURS } from '../constants';
import {
  Zap, Target, Calendar, Clock, CheckCircle,
  MessageSquare, Map, TrendingUp, Users, Star,
  Heart, AlertTriangle, Plus, Trash2, Edit3,
  ChevronRight, Award, Flame, Shield, Eye,
  BarChart2, BookOpen, Crosshair, Radio,
  GitBranch, PartyPopper, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Estimated total voters in SPETS ─────────────────────
// Admin can change this in the War Room settings
const DEFAULT_VOTER_POOL = 300;

// ── Tab bar ──────────────────────────────────────────────
const TABS = [
  { id: 'warroom',  label: 'War Room',  icon: Zap        },
  { id: 'scripts',  label: 'Scripts',   icon: MessageSquare },
  { id: 'strategy', label: 'Strategy',  icon: Crosshair  },
  { id: 'events',   label: 'Events',    icon: Calendar   },
];

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════
export default function CampaignJourneyPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('warroom');

  // ── Shared live data ───────────────────────────────────
  const [contacts,  setContacts]  = useState([]);
  const [events,    setEvents]    = useState([]);
  const [rivals,    setRivals]    = useState([]);
  const [settings,  setSettings]  = useState(null);
  

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'contacts'), orderBy('dateAdded','desc')), s =>
        setContacts(s.docs.map(d => ({ id:d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'events'), orderBy('eventDate','asc')), s =>
        setEvents(s.docs.map(d => ({ id:d.id, ...d.data() })))),
      onSnapshot(collection(db, 'rivals'), s =>
        setRivals(s.docs.map(d => ({ id:d.id, ...d.data() })))),
    ];
    // Load settings doc
    getDoc(doc(db, 'settings', 'campaign')).then(d => {
      if (d.exists()) setSettings(d.data());
    });
    return () => unsubs.forEach(u => u());
  }, []);

  const stats = useMemo(() => {
    const total      = contacts.length;
    const strong     = contacts.filter(c => c.supportLevel === 'Strong').length;
    const leaning    = contacts.filter(c => c.supportLevel === 'Leaning').length;
    const volunteers = contacts.filter(c => c.volunteer).length;
    const notContacted = contacts.filter(c => c.status === 'Not Contacted').length;
    const responded  = contacts.filter(c => ['Responded','Volunteer'].includes(c.status)).length;

    const voterPool  = settings?.voterPool || DEFAULT_VOTER_POOL;
    // Win probability formula:
    // strong = 1pt each, leaning = 0.5pt, volunteer = multiplies reach by 1.5
    const rawScore   = (strong + leaning * 0.5) * (1 + volunteers * 0.05);
    const winPct     = Math.min(Math.round((rawScore / (voterPool * 0.5)) * 100), 98);

    return { total, strong, leaning, volunteers, notContacted, responded, voterPool, winPct };
  }, [contacts, settings]);

  return (
    <div className="page fade-up">
      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaign Journey</h1>
          <p className="page-subtitle">Your full roadmap from today to victory in August</p>
        </div>
        <WinScorePill pct={stats.winPct} />
      </div>

      {/* ── Tab bar ──────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:24, background:'var(--bg-raised)', padding:5, borderRadius:12, width:'fit-content', flexWrap:'wrap' }}>
        {TABS.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
            borderRadius:9, border:'none', cursor:'pointer', fontFamily:'var(--font-body)',
            fontSize:13, fontWeight: tab===id ? 700 : 500, transition:'all .15s',
            background: tab===id ? 'var(--bg-card)' : 'transparent',
            color: tab===id ? 'var(--gold)' : 'var(--text-secondary)',
            boxShadow: tab===id ? '0 2px 8px rgba(0,0,0,.3)' : 'none',
          }}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────── */}
      {tab === 'warroom'  && <WarRoomTab  stats={stats} contacts={contacts} settings={settings} setSettings={setSettings} isAdmin={isAdmin}/>}
      {tab === 'scripts'  && <ScriptsTab  contacts={contacts} />}
      {tab === 'strategy' && <StrategyTab contacts={contacts} rivals={rivals} isAdmin={isAdmin}/>}
      {tab === 'events'   && <EventsTab   events={events} contacts={contacts} isAdmin={isAdmin}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 1 — WAR ROOM
// ════════════════════════════════════════════════════════
function WarRoomTab({ stats, contacts, settings, setSettings, isAdmin }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div className="grid-2" style={{ alignItems:'start' }}>
        <CountdownCard settings={settings} setSettings={setSettings} isAdmin={isAdmin}/>
        <WinProbabilityCard stats={stats} settings={settings} setSettings={setSettings} isAdmin={isAdmin}/>
      </div>
      <DailyMissionBoard stats={stats} contacts={contacts}/>
    </div>
  );
}

// ── Countdown ────────────────────────────────────────────
function CountdownCard({ settings, setSettings, isAdmin }) {
  const [editing,  setEditing]  = useState(false);
  const [dateVal,  setDateVal]  = useState('');
  const [nameVal,  setNameVal]  = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const electionDate = settings?.electionDate ? new Date(settings.electionDate) : null;
  const electionName = settings?.electionName || 'Election Day';

  useEffect(() => {
    if (!electionDate) return;
    function tick() {
      const diff = electionDate - new Date();
      if (diff <= 0) { setTimeLeft({ done: true }); return; }
      const days    = Math.floor(diff / 86400000);
      const hours   = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [electionDate]);

  async function saveDate() {
    if (!dateVal) return toast.error('Pick a date first');
    const data = { electionDate: dateVal, electionName: nameVal || 'Election Day', voterPool: settings?.voterPool || DEFAULT_VOTER_POOL };
    await setDoc(doc(db, 'settings', 'campaign'), data, { merge:true });
    setSettings(s => ({ ...s, ...data }));
    toast.success('Election date saved!');
    setEditing(false);
  }

  return (
    <div className="card" style={{ textAlign:'center', position:'relative', overflow:'hidden' }}>
      {/* glow */}
      <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', width:200, height:200, borderRadius:'50%', background:'var(--gold)', opacity:.04, pointerEvents:'none' }}/>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={15} color="var(--gold)"/>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.06em' }}>COUNTDOWN</span>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(v => !v); setDateVal(settings?.electionDate||''); setNameVal(settings?.electionName||''); }}>
            <Edit3 size={12}/> {editing ? 'Cancel' : 'Set Date'}
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12, textAlign:'left' }}>
          <div>
            <label>Election Name</label>
            <input placeholder="e.g. SRC Elections" value={nameVal} onChange={e => setNameVal(e.target.value)}/>
          </div>
          <div>
            <label>Election Date</label>
            <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}/>
          </div>
          <button className="btn btn-gold btn-sm" onClick={saveDate} style={{ justifyContent:'center' }}>
            <Save size={13}/> Save Date
          </button>
        </div>
      ) : electionDate && timeLeft ? (
        timeLeft.done ? (
          <div style={{ padding:'20px 0' }}>
            <PartyPopper size={40} color="var(--gold)" style={{ margin:'0 auto 12px' }}/>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--gold)' }}>Election Day!</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--text-muted)', marginBottom:16, letterSpacing:'.06em' }}>
              {electionName.toUpperCase()}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:10 }}>
              {[
                { val: timeLeft.days,    label:'DAYS'    },
                { val: timeLeft.hours,   label:'HOURS'   },
                { val: timeLeft.minutes, label:'MINS'    },
                { val: timeLeft.seconds, label:'SECS'    },
              ].map(({ val, label }) => (
                <div key={label} style={{ background:'var(--bg-raised)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 10px', minWidth:58, textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--gold)', lineHeight:1 }}>
                    {String(val).padStart(2,'0')}
                  </div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:4, fontWeight:700, letterSpacing:'.08em' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {electionDate.toDateString()}
            </div>
          </>
        )
      ) : (
        <div style={{ padding:'30px 0', color:'var(--text-muted)', fontSize:13 }}>
          {isAdmin ? (
            <>
              <Clock size={32} style={{ margin:'0 auto 12px', color:'var(--text-muted)', display:'block' }}/>
              Click "Set Date" to start the countdown
            </>
          ) : 'Admin hasn\'t set the election date yet'}
        </div>
      )}
    </div>
  );
}

// ── Win Probability ──────────────────────────────────────
function WinProbabilityCard({ stats, settings, setSettings, isAdmin }) {
  const [editPool, setEditPool] = useState(false);
  const [poolVal,  setPoolVal]  = useState('');

  async function savePool() {
    const n = parseInt(poolVal);
    if (!n || n < 10) return toast.error('Enter a valid number (min 10)');
    await setDoc(doc(db, 'settings', 'campaign'), { voterPool: n }, { merge:true });
    setSettings(s => ({ ...s, voterPool: n }));
    toast.success('Voter pool updated');
    setEditPool(false);
  }

  const pct = stats.winPct;
  const colour = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : pct >= 30 ? 'var(--purple)' : 'var(--red)';
  const verdict = pct >= 70 ? 'Strong Position' : pct >= 50 ? 'Competitive' : pct >= 30 ? 'Building Momentum' : 'Early Stage';

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TrendingUp size={15} color="var(--green)"/>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'.06em' }}>WIN PROBABILITY</span>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-xs" onClick={() => { setEditPool(v => !v); setPoolVal(String(stats.voterPool)); }}>
            <Edit3 size={12}/> {editPool ? 'Cancel' : 'Set Pool'}
          </button>
        )}
      </div>

      {editPool ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label>Estimated Total Voters in SPETS</label>
            <input type="number" placeholder="e.g. 300" value={poolVal} onChange={e => setPoolVal(e.target.value)}/>
          </div>
          <button className="btn btn-gold btn-sm" onClick={savePool} style={{ justifyContent:'center' }}><Save size={13}/> Save</button>
        </div>
      ) : (
        <>
          {/* Big score */}
          <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:64, fontWeight:800, color: colour, lineHeight:1, marginBottom:6 }}>
              {pct}%
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', borderRadius:20, background:`${colour}18`, border:`1px solid ${colour}30` }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:colour }}/>
              <span style={{ fontSize:12, fontWeight:700, color: colour }}>{verdict}</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Strong Supporters', val:stats.strong,     colour:'var(--green)',  note:'1.0 pt each' },
              { label:'Leaning Contacts',  val:stats.leaning,    colour:'var(--gold)',   note:'0.5 pt each' },
              { label:'Volunteers',        val:stats.volunteers, colour:'var(--blue)',   note:'+5% reach each' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:100, fontSize:11, color:'var(--text-secondary)', flexShrink:0 }}>{r.label}</div>
                <div style={{ flex:1, height:6, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${stats.total ? (r.val/stats.total*100) : 0}%`, background:r.colour, borderRadius:3, transition:'width .6s ease' }}/>
                </div>
                <div style={{ width:22, textAlign:'right', fontSize:12, fontWeight:700, color:r.colour }}>{r.val}</div>
                <div style={{ width:72, fontSize:10, color:'var(--text-muted)' }}>{r.note}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:12, textAlign:'center' }}>
            Based on {stats.voterPool} estimated voters in SPETS
          </p>
        </>
      )}
    </div>
  );
}

// ── Daily Mission Board ──────────────────────────────────
function DailyMissionBoard({ stats, contacts }) {
  // Generate smart missions based on current data state
  const missions = useMemo(() => {
    const list = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const todayContacts = contacts.filter(c => {
      if (!c.dateAdded) return false;
      const d = c.dateAdded.toDate ? c.dateAdded.toDate() : new Date(c.dateAdded);
      return d >= today;
    }).length;

    // Always show daily contact target
    list.push({
      id: 'daily-contacts',
      priority: 'HIGH',
      icon: Users,
      colour: 'var(--blue)',
      title: `Add ${Math.max(0, 5 - todayContacts)} more contacts today`,
      detail: `You've added ${todayContacts} contacts today. Daily target is 5. Small consistent effort wins elections.`,
      done: todayContacts >= 5,
    });

    // Follow up not contacted strong supporters
    const hotLeads = contacts.filter(c => c.supportLevel === 'Strong' && c.status === 'Not Contacted').length;
    if (hotLeads > 0) {
      list.push({
        id: 'hot-leads',
        priority: 'HIGH',
        icon: Flame,
        colour: 'var(--red)',
        title: `Follow up ${hotLeads} untouched Strong Supporters`,
        detail: `You have ${hotLeads} people marked Strong who haven't been contacted yet. These are your easiest wins — message them now.`,
        done: false,
      });
    }

    // Convert leaning contacts
    const leaning = contacts.filter(c => c.supportLevel === 'Leaning' && c.status !== 'Not Interested').length;
    if (leaning > 0) {
      list.push({
        id: 'convert-leaning',
        priority: 'MEDIUM',
        icon: Target,
        colour: 'var(--gold)',
        title: `Push ${leaning} Leaning contacts to Strong`,
        detail: 'One good conversation moves someone from Leaning to Strong. Focus on their concerns and show you understand them.',
        done: false,
      });
    }

    // Recruit volunteers
    if (stats.volunteers < 5) {
      list.push({
        id: 'recruit-volunteers',
        priority: 'HIGH',
        icon: Heart,
        colour: 'var(--green)',
        title: 'Ask your 3 strongest supporters to volunteer',
        detail: 'Each volunteer multiplies your reach. A volunteer who recruits 3 friends is worth 4 votes. Ask today.',
        done: stats.volunteers >= 5,
      });
    }

    // Weak programmes
    const progCounts = {};
    contacts.forEach(c => { if (c.programme) progCounts[c.programme] = (progCounts[c.programme]||0)+1; });
    const weakProg = ['PE','PG','CH','NG','RP'].find(p => !progCounts[p] || progCounts[p] < 5);
    if (weakProg) {
      list.push({
        id: 'weak-programme',
        priority: 'MEDIUM',
        icon: AlertTriangle,
        colour: 'var(--purple)',
        title: `Expand into ${weakProg} — only ${progCounts[weakProg]||0} contacts there`,
        detail: `${weakProg} is underrepresented. Find 2–3 people you know there and start a conversation this week.`,
        done: false,
      });
    }

    // Neutral contacts to move
    const neutrals = contacts.filter(c => c.supportLevel === 'Neutral').length;
    if (neutrals > 0) {
      list.push({
        id: 'move-neutrals',
        priority: 'LOW',
        icon: MessageSquare,
        colour: 'var(--cyan)',
        title: `Have a deeper conversation with ${neutrals} Neutral contacts`,
        detail: 'Neutral doesn\'t mean lost — it means you haven\'t found the right angle yet. Ask what matters most to them.',
        done: false,
      });
    }

    return list.sort((a,b) => {
      const o = { HIGH:0, MEDIUM:1, LOW:2 };
      return o[a.priority] - o[b.priority];
    });
  }, [contacts, stats]);

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CheckCircle size={15} color="var(--gold)"/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Daily Mission Board</span>
        </div>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Auto-generated from your live data</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {missions.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.id} style={{
              display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
              borderRadius:12, border:'1px solid',
              borderColor: m.done ? 'var(--green)' : m.priority==='HIGH' ? `${m.colour}40` : 'var(--border)',
              background: m.done ? 'var(--green-glow)' : m.priority==='HIGH' ? `${m.colour}08` : 'var(--bg-raised)',
              opacity: m.done ? 0.7 : 1,
            }}>
              <div style={{ padding:8, borderRadius:9, background:`${m.colour}18`, flexShrink:0, marginTop:1 }}>
                <Icon size={15} color={m.done ? 'var(--green)' : m.colour}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color: m.done ? 'var(--green)' : 'var(--text-primary)', textDecoration: m.done ? 'line-through' : 'none' }}>
                    {m.done && '✓ '}{m.title}
                  </span>
                  <span style={{
                    fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, letterSpacing:'.06em',
                    background: m.priority==='HIGH' ? 'rgba(255,77,109,.15)' : m.priority==='MEDIUM' ? 'var(--gold-glow)' : 'var(--bg-card)',
                    color: m.priority==='HIGH' ? 'var(--red)' : m.priority==='MEDIUM' ? 'var(--gold)' : 'var(--text-muted)',
                  }}>{m.priority}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{m.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 2 — SCRIPTS
// ════════════════════════════════════════════════════════
const SCRIPTS = [
  {
    type: 'Strong Supporter',
    colour: 'var(--green)',
    badge: 'badge-green',
    icon: Star,
    approach: 'Confirm & Activate',
    opener: "Hey [Name]! Just checking in — are you still with us for the election? We're counting on you and need to know we can count on your vote.",
    followUp: "Amazing! Can I ask — do you know 2 or 3 friends in [their programme] who might also support us? Your referral carries a lot of weight.",
    close: "We'll be in touch closer to election day. Thank you for being part of this. 🙏",
    tips: ['Keep it short — they already like you. Just confirm the commitment.', 'Ask for referrals. A strong supporter\'s endorsement converts neutrals.', 'Offer them a volunteer role if they seem enthusiastic.'],
  },
  {
    type: 'Leaning / Undecided',
    colour: 'var(--gold)',
    badge: 'badge-gold',
    icon: Target,
    approach: 'Listen First, Persuade Second',
    opener: "Hey [Name], I know we talked briefly before. I wanted to follow up — what's most important to you in the next SRC leadership?",
    followUp: "That's really important. Our campaign is specifically focused on [tie their concern to your platform]. Does that resonate with you?",
    close: "I'd love your support. Even if you're not fully decided, being able to count you in means a lot to us.",
    tips: ['Ask first, pitch second. Find out what they care about.', 'Connect your platform directly to their stated concern.', 'Don\'t push too hard — plant the seed and follow up in 3 days.'],
  },
  {
    type: 'Neutral Contact',
    colour: 'var(--blue)',
    badge: 'badge-blue',
    icon: Eye,
    approach: 'Educate & Engage',
    opener: "Hey [Name]! Quick question — are you following the SRC elections at all? I'm actually running and would love 2 minutes of your time.",
    followUp: "The main thing we're fighting for is [your top policy]. As someone in [their level/programme], this directly affects you because [specific reason].",
    close: "I'm not asking you to campaign for me — just asking you to show up and vote. Can I count on you?",
    tips: ['Many neutrals just haven\'t been engaged. Be the first to engage them properly.', 'Make it personal — connect your platform to their specific year or programme.', 'Keep it a conversation, not a speech.'],
  },
  {
    type: 'Potential Volunteer',
    colour: 'var(--purple)',
    badge: 'badge-purple',
    icon: Heart,
    approach: 'Make It Feel Important',
    opener: "Hey [Name] — I wanted to reach out personally. I've been impressed by how people respect you, and I think you'd be incredible as part of our campaign team.",
    followUp: "What we need is people who can talk to their friends honestly. Not campaign shouting — just genuine conversation. Can you do that for us?",
    close: "I'll add you to our team WhatsApp group. We keep it simple — just updates, no pressure. You in?",
    tips: ['Make them feel chosen, not recruited.', 'Give them a specific role, not a vague ask.', 'Follow up within 24 hours of their yes.'],
  },
  {
    type: 'Rep / Influential Person',
    colour: 'var(--red)',
    badge: 'badge-red',
    icon: Award,
    approach: 'Peer to Peer — Respect Their Status',
    opener: "Hey [Name], I know you're well-connected in [department/hall]. I wanted to speak to you directly because your opinion actually shapes what others think.",
    followUp: "I'm not asking you to actively campaign — just asking you to not oppose us, and if you believe in what we're doing, maybe say so quietly to your people.",
    close: "What would it take for you to feel comfortable backing us? I want to know your concerns first.",
    tips: ['Never approach an influencer like a regular contact. Acknowledge their status.', 'Be direct — they respect that more than soft-sell.', 'Even neutral endorsement from an influencer is valuable.'],
  },
];

function ScriptsTab({ contacts }) {
  const [active, setActive] = useState(0);
  const s = SCRIPTS[active];
  const Icon = s.icon;

  // Count relevant contacts
  const counts = {
    'Strong Supporter':    contacts.filter(c => c.supportLevel === 'Strong').length,
    'Leaning / Undecided': contacts.filter(c => c.supportLevel === 'Leaning').length,
    'Neutral Contact':     contacts.filter(c => c.supportLevel === 'Neutral' || !c.supportLevel).length,
    'Potential Volunteer': contacts.filter(c => !c.volunteer && c.supportLevel === 'Strong').length,
    'Rep / Influential Person': contacts.filter(c => (c.tags||[]).includes('Influential') || (c.tags||[]).includes('Rep')).length,
  };

  return (
    <div className="grid-2" style={{ alignItems:'start' }}>
      {/* Script selector */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:4 }}>SELECT CONTACT TYPE</div>
        {SCRIPTS.map((sc, i) => {
          const Ic = sc.icon;
          const count = counts[sc.type] || 0;
          return (
            <button key={i} onClick={() => setActive(i)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              borderRadius:12, border:`1px solid ${active===i ? sc.colour : 'var(--border)'}`,
              background: active===i ? `${sc.colour}10` : 'var(--bg-raised)',
              cursor:'pointer', textAlign:'left', transition:'all .15s',
            }}>
              <div style={{ padding:7, borderRadius:8, background:`${sc.colour}18`, flexShrink:0 }}>
                <Ic size={14} color={sc.colour}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color: active===i ? sc.colour : 'var(--text-primary)' }}>{sc.type}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sc.approach}</div>
              </div>
              <span className={`badge badge-${active===i ? sc.badge.split('-')[1] : 'gray'}`} style={{ fontSize:10 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Script display */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
          <div style={{ padding:9, borderRadius:10, background:`${s.colour}18` }}>
            <Icon size={16} color={s.colour}/>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>{s.type}</div>
            <span className={`badge ${s.badge}`} style={{ fontSize:10 }}>{s.approach}</span>
          </div>
        </div>

        <ScriptBlock label="OPENER" colour={s.colour} text={s.opener}/>
        <ScriptBlock label="FOLLOW-UP" colour={s.colour} text={s.followUp}/>
        <ScriptBlock label="CLOSE" colour={s.colour} text={s.close}/>

        <div style={{ marginTop:18, padding:'14px', borderRadius:10, background:'var(--bg-raised)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:8 }}>💡 COACHING TIPS</div>
          {s.tips.map((t, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
              <span style={{ color:s.colour, flexShrink:0, fontWeight:700 }}>→</span>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScriptBlock({ label, colour, text }) {
  function copy() {
    navigator.clipboard?.writeText(text);
    toast.success('Copied to clipboard!');
  }
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em' }}>{label}</span>
        <button onClick={copy} className="btn btn-ghost btn-xs" style={{ fontSize:10 }}>Copy</button>
      </div>
      <div style={{
        padding:'12px 14px', borderRadius:10, fontSize:13, lineHeight:1.6,
        background:`${colour}08`, border:`1px solid ${colour}20`,
        color:'var(--text-primary)', fontStyle:'italic',
      }}>
        "{text}"
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 3 — STRATEGY
// ════════════════════════════════════════════════════════
function StrategyTab({ contacts, rivals, isAdmin }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <CanvassingPlanner contacts={contacts}/>
      <CompetitorIntel rivals={rivals} isAdmin={isAdmin}/>
    </div>
  );
}

// ── Canvassing Planner ───────────────────────────────────
function CanvassingPlanner({ contacts }) {
  const PROGRAMMES = ['PE','PG','CH','NG','RP','Other'];
  const LEVELS     = ['100','200','300','400'];

  const progData = PROGRAMMES.map(p => {
    const total   = contacts.filter(c => c.programme === p).length;
    const strong  = contacts.filter(c => c.programme === p && c.supportLevel === 'Strong').length;
    const score   = total === 0 ? 0 : Math.round(strong/total*100);
    const priority = total < 5 ? 'No presence' : score < 30 ? 'Needs work' : score < 60 ? 'Building' : 'Strong';
    const pColour  = total < 5 ? 'var(--red)' : score < 30 ? 'var(--gold)' : score < 60 ? 'var(--blue)' : 'var(--green)';
    return { name:p, total, strong, score, priority, pColour };
  }).sort((a,b) => a.score - b.score);

  const levelData = LEVELS.map(l => {
    const total  = contacts.filter(c => c.level === l).length;
    const strong = contacts.filter(c => c.level === l && c.supportLevel === 'Strong').length;
    return { name:`Level ${l}`, total, strong };
  });

  const hostelMap = {};
  contacts.forEach(c => {
    if (!c.hostel) return;
    if (!hostelMap[c.hostel]) hostelMap[c.hostel] = { total:0, strong:0 };
    hostelMap[c.hostel].total++;
    if (c.supportLevel === 'Strong') hostelMap[c.hostel].strong++;
  });
  const hostelData = Object.entries(hostelMap)
    .sort((a,b) => (b[1].strong/Math.max(b[1].total,1)) - (a[1].strong/Math.max(a[1].total,1)))
    .slice(0,6);

  // Generate canvassing priority
  const topPriority = progData.filter(p => p.total < 5 || p.score < 40).slice(0,3);

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <Map size={15} color="var(--blue)"/>
        <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Canvassing Planner</span>
        <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:4 }}>Where to focus your next 48 hours</span>
      </div>

      {/* Priority alert */}
      {topPriority.length > 0 && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,77,109,.08)', border:'1px solid rgba(255,77,109,.2)', marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--red)', marginBottom:6, letterSpacing:'.06em' }}>🎯 PRIORITY ZONES THIS WEEK</div>
          {topPriority.map(p => (
            <div key={p.name} style={{ fontSize:13, color:'var(--text-primary)', marginBottom:3 }}>
              → <strong>{p.name}</strong> — {p.total < 5 ? `Only ${p.total} contacts. You need more presence here.` : `${p.score}% strong rate. Needs more convincing conversations.`}
            </div>
          ))}
        </div>
      )}

      <div className="grid-2">
        {/* Programme breakdown */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:10 }}>BY PROGRAMME</div>
          {progData.map(p => (
            <div key={p.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:32, fontWeight:700, fontSize:12, color:'var(--text-primary)' }}>{p.name}</div>
              <div style={{ flex:1, height:20, background:'var(--bg-raised)', borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${p.total > 0 ? Math.max(p.score, 4) : 0}%`, background:p.pColour, borderRadius:5, transition:'width .6s ease', display:'flex', alignItems:'center', paddingLeft:6 }}>
                  {p.total > 0 && <span style={{ fontSize:10, fontWeight:700, color:'#080C12' }}>{p.total}</span>}
                </div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:p.pColour, width:70, textAlign:'right' }}>{p.priority}</span>
            </div>
          ))}
        </div>

        {/* Level + Hostel */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:10 }}>BY LEVEL</div>
          <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
            {levelData.map((l, i) => (
              <div key={l.name} style={{ flex:1, minWidth:60, textAlign:'center', padding:'10px 8px', background:'var(--bg-raised)', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:CHART_COLOURS[i] }}>{l.total}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{l.name}</div>
                <div style={{ fontSize:10, color:'var(--green)', marginTop:2 }}>{l.strong} strong</div>
              </div>
            ))}
          </div>

          {hostelData.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:8 }}>TOP HOSTELS</div>
              {hostelData.map(([name, d]) => (
                <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'var(--text-primary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                  <span style={{ fontSize:11, color:'var(--green)', marginLeft:8, fontWeight:600 }}>{d.strong}/{d.total}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Competitor Intelligence ──────────────────────────────
function CompetitorIntel({ rivals, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name:'', move:'', threat:'Medium', date: new Date().toISOString().split('T')[0] });
  const [saving,   setSaving]   = useState(false);

  async function saveRival() {
    if (!form.name || !form.move) return toast.error('Fill in competitor and their move');
    setSaving(true);
    try {
      await addDoc(collection(db, 'rivals'), { ...form, createdAt: serverTimestamp() });
      toast.success('Intel logged');
      setForm({ name:'', move:'', threat:'Medium', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
    } catch { toast.error('Could not save'); }
    finally { setSaving(false); }
  }

  async function deleteRival(id) {
    await deleteDoc(doc(db, 'rivals', id));
    toast.success('Removed');
  }

  const threatColour = { High:'var(--red)', Medium:'var(--gold)', Low:'var(--green)' };

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Shield size={15} color="var(--red)"/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Competitor Intelligence</span>
        </div>
        {isAdmin && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X size={13}/> : <Plus size={13}/>} {showForm ? 'Cancel' : 'Log Move'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div style={{ padding:'16px', borderRadius:10, background:'var(--bg-raised)', border:'1px solid var(--border)', marginBottom:16 }}>
          <div className="form-grid" style={{ marginBottom:12 }}>
            <div>
              <label>Competitor Name</label>
              <input placeholder="e.g. Rival Candidate A" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))}/>
            </div>
            <div>
              <label>Threat Level</label>
              <select value={form.threat} onChange={e => setForm(f => ({...f, threat:e.target.value}))}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="form-full">
              <label>Their Move / Activity</label>
              <input placeholder="e.g. Distributed flyers in Volta Hall, promised free printing" value={form.move} onChange={e => setForm(f => ({...f, move:e.target.value}))}/>
            </div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={saveRival} disabled={saving} style={{ justifyContent:'center' }}>
            <Save size={13}/> {saving ? 'Saving…' : 'Log Intel'}
          </button>
        </div>
      )}

      {rivals.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--text-muted)', fontSize:13 }}>
          <Shield size={32} style={{ margin:'0 auto 12px', display:'block', opacity:.3 }}/>
          No competitor moves logged yet.{isAdmin ? ' Click "Log Move" to track what opponents are doing.' : ' Admin will log competitor intel here.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rivals.map(r => (
            <div key={r.id} style={{
              display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px',
              borderRadius:10, background:'var(--bg-raised)',
              border:`1px solid ${threatColour[r.threat]}30`,
            }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:threatColour[r.threat], flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{r.name}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${threatColour[r.threat]}18`, color:threatColour[r.threat] }}>
                    {r.threat} Threat
                  </span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{r.move}</p>
                {r.date && <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{r.date}</p>}
              </div>
              {isAdmin && (
                <button className="btn btn-ghost btn-xs" onClick={() => deleteRival(r.id)}>
                  <Trash2 size={11}/>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 4 — EVENTS
// ════════════════════════════════════════════════════════
function EventsTab({ events, contacts, isAdmin }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <EventTracker events={events} isAdmin={isAdmin}/>
      <ReferralChain contacts={contacts}/>
    </div>
  );
}

// ── Event Tracker ────────────────────────────────────────
function EventTracker({ events, isAdmin }) {
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ title:'', location:'', eventDate:'', goal:'', notes:'' });
  const [saving,    setSaving]    = useState(false);

  async function saveEvent() {
    if (!form.title || !form.eventDate) return toast.error('Title and date are required');
    setSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...form,
        attendees: 0,
        createdAt: serverTimestamp(),
      });
      toast.success('Event created!');
      setForm({ title:'', location:'', eventDate:'', goal:'', notes:'' });
      setShowForm(false);
    } catch { toast.error('Could not save event'); }
    finally { setSaving(false); }
  }

  async function updateAttendees(id, current, delta) {
    const n = Math.max(0, (current||0) + delta);
    await updateDoc(doc(db, 'events', id), { attendees: n });
  }

  async function deleteEvent(id) {
    await deleteDoc(doc(db, 'events', id));
    toast.success('Event deleted');
  }

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.eventDate) >= now);
  const past     = events.filter(e => new Date(e.eventDate) < now);

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Radio size={15} color="var(--purple)"/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Event & Rally Tracker</span>
        </div>
        {isAdmin && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X size={13}/> : <Plus size={13}/>} {showForm ? 'Cancel' : 'New Event'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div style={{ padding:'16px', borderRadius:10, background:'var(--bg-raised)', border:'1px solid var(--border)', marginBottom:16 }}>
          <div className="form-grid" style={{ marginBottom:12 }}>
            <div>
              <label>Event Title</label>
              <input placeholder="e.g. Volta Hall Rally" value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))}/>
            </div>
            <div>
              <label>Date & Time</label>
              <input type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({...f,eventDate:e.target.value}))}/>
            </div>
            <div>
              <label>Location</label>
              <input placeholder="e.g. Volta Hall Common Room" value={form.location} onChange={e => setForm(f => ({...f,location:e.target.value}))}/>
            </div>
            <div>
              <label>Attendance Goal</label>
              <input type="number" placeholder="e.g. 50" value={form.goal} onChange={e => setForm(f => ({...f,goal:e.target.value}))}/>
            </div>
            <div className="form-full">
              <label>Notes</label>
              <input placeholder="What needs to happen at this event?" value={form.notes} onChange={e => setForm(f => ({...f,notes:e.target.value}))}/>
            </div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={saveEvent} disabled={saving} style={{ justifyContent:'center' }}>
            <Save size={13}/> {saving ? 'Saving…' : 'Create Event'}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--text-muted)', fontSize:13 }}>
          <Calendar size={32} style={{ margin:'0 auto 12px', display:'block', opacity:.3 }}/>
          No events yet. {isAdmin ? 'Create your first rally or meeting.' : 'Admin will schedule events here.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', letterSpacing:'.07em' }}>UPCOMING</div>
              {upcoming.map(e => <EventRow key={e.id} event={e} isAdmin={isAdmin} onAttendees={updateAttendees} onDelete={deleteEvent} upcoming/>)}
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginTop:8 }}>PAST EVENTS</div>
              {past.map(e => <EventRow key={e.id} event={e} isAdmin={isAdmin} onAttendees={updateAttendees} onDelete={deleteEvent}/>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ event: e, isAdmin, onAttendees, onDelete, upcoming }) {
  const goal      = parseInt(e.goal) || 0;
  const pct       = goal > 0 ? Math.min(Math.round(e.attendees/goal*100), 100) : 0;
  const dateStr   = e.eventDate ? new Date(e.eventDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';

  return (
    <div style={{
      padding:'14px 16px', borderRadius:12, border:'1px solid',
      borderColor: upcoming ? 'rgba(139,92,246,.3)' : 'var(--border)',
      background: upcoming ? 'rgba(139,92,246,.06)' : 'var(--bg-raised)',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{e.title}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            {dateStr}{e.location ? ` · ${e.location}` : ''}
          </div>
          {e.notes && <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>{e.notes}</p>}
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-xs" onClick={() => onDelete(e.id)}><Trash2 size={11}/></button>
        )}
      </div>

      {/* Attendance tracker */}
      <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Attendance:</span>
        {isAdmin && (
          <button className="btn btn-ghost btn-xs" onClick={() => onAttendees(e.id, e.attendees, -1)} style={{ padding:'2px 8px' }}>−</button>
        )}
        <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--purple)' }}>{e.attendees || 0}</span>
        {isAdmin && (
          <button className="btn btn-ghost btn-xs" onClick={() => onAttendees(e.id, e.attendees, 1)} style={{ padding:'2px 8px' }}>+</button>
        )}
        {goal > 0 && (
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
            <div className="progress-track" style={{ flex:1 }}>
              <div className="progress-fill" style={{ width:`${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--purple)' }}/>
            </div>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{pct}% of {goal} goal</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Referral Chain ───────────────────────────────────────
function ReferralChain({ contacts }) {
  // Show influential people and their network potential
  const influential = contacts.filter(c =>
    (c.tags||[]).includes('Influential') || (c.tags||[]).includes('Rep') || c.volunteer
  );

  const strongByProg = {};
  contacts.filter(c => c.supportLevel === 'Strong').forEach(c => {
    if (c.programme) strongByProg[c.programme] = (strongByProg[c.programme]||0)+1;
  });

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <GitBranch size={15} color="var(--cyan)"/>
        <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Referral Chain</span>
        <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:4 }}>Your key people who can bring others in</span>
      </div>

      <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-raised)', marginBottom:16, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
        💡 Each influential contact or volunteer can realistically bring <strong style={{ color:'var(--cyan)' }}>3–5 more votes</strong> through their network. Focus on activating these people first.
      </div>

      {influential.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px', color:'var(--text-muted)', fontSize:13 }}>
          Tag contacts as "Influential" or "Rep" when adding them, and they'll appear here as network nodes.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {influential.slice(0,10).map((c, i) => {
            const isVol = c.volunteer;
            const isInf = (c.tags||[]).includes('Influential') || (c.tags||[]).includes('Rep');
            const potential = isVol && isInf ? 5 : isVol ? 3 : 2;
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${CHART_COLOURS[i%CHART_COLOURS.length]},${CHART_COLOURS[(i+2)%CHART_COLOURS.length]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {c.fullName?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.fullName}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.programme} · Lvl {c.level} · {c.hostel||'—'}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {(c.tags||[]).map(t => (
                    <span key={t} style={{ padding:'2px 7px', borderRadius:4, background:'var(--bg-card)', color:'var(--cyan)', fontSize:10, fontWeight:700 }}>{t}</span>
                  ))}
                  {isVol && <span className="badge badge-green" style={{ fontSize:10 }}>Volunteer</span>}
                </div>
                <div style={{ textAlign:'center', minWidth:50 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--cyan)' }}>+{potential}</div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', lineHeight:1.2 }}>reach</div>
                </div>
              </div>
            );
          })}
          {influential.length > 10 && (
            <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)' }}>+ {influential.length-10} more key people</p>
          )}
        </div>
      )}

      {/* Network potential summary */}
      <div style={{ marginTop:16, padding:'12px 14px', borderRadius:10, border:'1px solid rgba(6,182,212,.2)', background:'rgba(6,182,212,.06)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--cyan)', letterSpacing:'.06em', marginBottom:6 }}>NETWORK POTENTIAL</div>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Key people: <strong style={{ color:'var(--cyan)' }}>{influential.length}</strong></span>
          <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Potential reach: <strong style={{ color:'var(--cyan)' }}>~{influential.reduce((s, c) => s + ((c.volunteer && ((c.tags||[]).includes('Influential')||(c.tags||[]).includes('Rep'))) ? 5 : c.volunteer ? 3 : 2), 0)} extra votes</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Win score pill (header) ──────────────────────────────
function WinScorePill({ pct }) {
  const colour = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : pct >= 30 ? 'var(--purple)' : 'var(--red)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:`${colour}10`, border:`1px solid ${colour}30`, borderRadius:20 }}>
      <TrendingUp size={14} color={colour}/>
      <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, color: colour }}>{pct}%</span>
      <span style={{ fontSize:12, color:'var(--text-secondary)' }}>win probability</span>
    </div>
  );
}