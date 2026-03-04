// src/pages/BroadcastPage.jsx
// WhatsApp Broadcast Centre — 4 tabs
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, doc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PROGRAMMES, LEVELS, HOSTELS, SUPPORT_LEVELS, CONTACT_STATUSES } from '../constants';
import {
  MessageCircle, Send, Copy, Download, Clock,
  Users, Filter, CheckCircle, X, History,
  FileSpreadsheet, Phone, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, Eye, Plus, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id:'compose', label:'Compose Broadcast', icon:MessageCircle },
  { id:'history', label:'Broadcast History',  icon:History       },
  { id:'import',  label:'Import Contacts',    icon:FileSpreadsheet},
  { id:'sms',     label:'SMS Fallback',        icon:Phone         },
];

const MERGE_TAGS = [
  { token:'{{name}}',      desc:'Full name'   },
  { token:'{{firstName}}', desc:'First name'  },
  { token:'{{programme}}', desc:'Programme'   },
  { token:'{{level}}',     desc:'Level'       },
  { token:'{{hostel}}',    desc:'Hostel'      },
];

const STARTER_TEMPLATES = [
  { name:'General Support Ask', body:`Hello {{firstName}} 👋\n\nI hope you're doing well! I'm running for [POSITION] in the upcoming SPETS elections.\n\nOur campaign is focused on [YOUR POLICY], and as a {{programme}} student, this directly affects you.\n\nCan I count on your vote? 🙏\n\nThank you!` },
  { name:'Rally Invitation',    body:`Hi {{firstName}}! 🔥\n\nWe're holding a campaign event and I'd love to see you there!\n\n📅 Date: [DATE]\n📍 Location: [VENUE]\n🕐 Time: [TIME]\n\nCome and hear our plans for SPETS. Please bring a friend! 🙌` },
  { name:'Election Day Reminder', body:`Good morning {{firstName}}! ☀️\n\nToday is Election Day — your vote matters!\n\n✅ Polls open at [TIME]\n📍 Vote at [LOCATION]\n\nPlease take 5 minutes to vote today. Every vote counts! 💪` },
  { name:'Volunteer Ask',       body:`Hi {{firstName}} 👋\n\nI wanted to reach out personally. We need people who can help us on the ground in {{hostel}}.\n\nCan you give us 2 hours on [DATE]?\n\nReply YES and I'll add you to our team WhatsApp 🙌` },
];

function personalise(msg, contact) {
  const firstName = contact.fullName?.split(' ')[0] || '';
  return msg
    .replace(/\{\{name\}\}/g,      contact.fullName  || '')
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{programme\}\}/g, contact.programme || '')
    .replace(/\{\{level\}\}/g,     contact.level     || '')
    .replace(/\{\{hostel\}\}/g,    contact.hostel    || '');
}

export default function BroadcastPage() {
  const [tab,        setTab]        = useState('compose');
  const [contacts,   setContacts]   = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,'contacts'), orderBy('dateAdded','desc')),
      s => setContacts(s.docs.map(d => ({id:d.id,...d.data()}))));
    const u2 = onSnapshot(query(collection(db,'broadcasts'), orderBy('createdAt','desc')),
      s => setBroadcasts(s.docs.map(d => ({id:d.id,...d.data()}))));
    return () => { u1(); u2(); };
  }, []);

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Broadcast Centre</h1>
          <p className="page-subtitle">WhatsApp campaigns · contact import · SMS fallback</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7,padding:'6px 13px',background:'rgba(0,208,132,.1)',border:'1px solid rgba(0,208,132,.2)',borderRadius:20}}>
          <MessageCircle size={13} color="var(--green)"/>
          <span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>{contacts.length} contacts</span>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:24,background:'var(--bg-raised)',padding:5,borderRadius:12,flexWrap:'wrap'}}>
        {TABS.map(({id,label,icon:Icon}) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display:'flex',alignItems:'center',gap:7,padding:'8px 16px',
            borderRadius:9,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',
            fontSize:13,fontWeight:tab===id?700:500,transition:'all .15s',
            background:tab===id?'var(--bg-card)':'transparent',
            color:tab===id?'var(--green)':'var(--text-secondary)',
            boxShadow:tab===id?'0 2px 8px rgba(0,0,0,.3)':'none',
          }}><Icon size={14}/> {label}</button>
        ))}
      </div>

      {tab==='compose' && <ComposeTab contacts={contacts}/>}
      {tab==='history' && <HistoryTab broadcasts={broadcasts}/>}
      {tab==='import'  && <ImportTab/>}
      {tab==='sms'     && <SmsTab contacts={contacts}/>}
    </div>
  );
}

// ── COMPOSE ──────────────────────────────────────────────
function ComposeTab({ contacts }) {
  const { currentUser, userProfile } = useAuth();
  const [filters,   setFilters]   = useState({programme:'',level:'',hostel:'',support:'',status:'',volunteer:''});
  const [showF,     setShowF]     = useState(false);
  const [tmplIdx,   setTmplIdx]   = useState(-1);
  const [message,   setMessage]   = useState('');
  const [bcastName, setBcastName] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00');
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState(null);

  const filt = useMemo(() => {
    let l = contacts;
    if (filters.programme) l = l.filter(c=>c.programme===filters.programme);
    if (filters.level)     l = l.filter(c=>c.level===filters.level);
    if (filters.hostel)    l = l.filter(c=>c.hostel===filters.hostel);
    if (filters.support)   l = l.filter(c=>c.supportLevel===filters.support);
    if (filters.status)    l = l.filter(c=>c.status===filters.status);
    if (filters.volunteer) l = l.filter(c=>c.volunteer===(filters.volunteer==='yes'));
    return l;
  }, [contacts, filters]);

  const activeF = Object.values(filters).filter(Boolean).length;
  const prevContact = preview || filt[0];

  function copyNums() {
    navigator.clipboard?.writeText(filt.map(c=>c.phone).filter(Boolean).join('\n'));
    toast.success(`${filt.length} numbers copied!`);
  }

  function exportNums() {
    const blob = new Blob([filt.map(c=>c.phone).filter(Boolean).join('\n')], {type:'text/plain'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`broadcast-${Date.now()}.txt`; a.click();
    toast.success(`${filt.length} numbers exported!`);
  }

  async function logBcast() {
    if (!message.trim()) return toast.error('Write your message first');
    if (!bcastName.trim()) return toast.error('Give this broadcast a name');
    if (filt.length===0) return toast.error('No contacts selected');
    setSaving(true);
    try {
      await addDoc(collection(db,'broadcasts'), {
        name: bcastName, message, filters:{...filters},
        recipientCount: filt.length,
        recipients: filt.slice(0,200).map(c=>({id:c.id,name:c.fullName,phone:c.phone})),
        sentBy: userProfile?.name||'Unknown',
        scheduled, scheduledFor: scheduled?`${schedDate}T${schedTime}`:null,
        status: scheduled?'Scheduled':'Sent',
        sentAt: scheduled?null:serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      if (!scheduled) {
        const batch = writeBatch(db);
        filt.filter(c=>c.status==='Not Contacted').slice(0,490).forEach(c=>
          batch.update(doc(db,'contacts',c.id),{status:'Contacted',lastContactDate:serverTimestamp()}));
        await batch.commit();
      }
      toast.success(scheduled?'Broadcast scheduled! ✅':`Logged for ${filt.length} contacts ✅`);
      setBcastName('');
    } catch(e){ toast.error('Save failed: '+e.message); }
    setSaving(false);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(0,208,132,.06)',border:'1px solid rgba(0,208,132,.2)',display:'flex',gap:12,alignItems:'flex-start'}}>
        <AlertCircle size={16} color="var(--green)" style={{flexShrink:0,marginTop:1}}/>
        <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6}}>
          <strong style={{color:'var(--text-primary)'}}>How it works:</strong> Filter contacts → write message with personalisation tags → copy/export numbers → open WhatsApp → New Broadcast → paste numbers → send. Then log it here so the CRM tracks history.
        </div>
      </div>

      <div className="grid-2" style={{alignItems:'start',gap:20}}>
        {/* LEFT — Audience */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Users size={15} color="var(--blue)"/>
                <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>Audience</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowF(v=>!v)}>
                <Filter size={13}/> Filters{activeF>0?` (${activeF})`:''} {showF?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
              </button>
            </div>

            <div style={{textAlign:'center',padding:'16px 0',borderRadius:12,background:'var(--bg-raised)',marginBottom:14}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:52,fontWeight:800,color:'var(--blue)',lineHeight:1}}>{filt.length}</div>
              <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:4}}>recipients selected</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>of {contacts.length} total</div>
            </div>

            {showF && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  {key:'programme',label:'Programme',opts:PROGRAMMES},
                  {key:'level',label:'Level',opts:LEVELS},
                  {key:'hostel',label:'Hostel',opts:HOSTELS},
                  {key:'support',label:'Support',opts:SUPPORT_LEVELS},
                  {key:'status',label:'Status',opts:CONTACT_STATUSES},
                ].map(({key,label,opts})=>(
                  <div key={key}>
                    <label>{label}</label>
                    <select value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))}>
                      <option value="">All {label}s</option>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label>Volunteers</label>
                  <select value={filters.volunteer} onChange={e=>setFilters(f=>({...f,volunteer:e.target.value}))}>
                    <option value="">Everyone</option>
                    <option value="yes">Volunteers only</option>
                    <option value="no">Non-volunteers</option>
                  </select>
                </div>
                {activeF>0 && <button className="btn btn-ghost btn-sm" onClick={()=>setFilters({programme:'',level:'',hostel:'',support:'',status:'',volunteer:''})}><X size={12}/> Clear filters</button>}
              </div>
            )}

            {/* Numbers export */}
            <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:10,fontWeight:700}}>📋 Step 1 — Get Numbers for WhatsApp</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-outline btn-sm" onClick={copyNums} style={{flex:1,justifyContent:'center'}}><Copy size={13}/> Copy</button>
                <button className="btn btn-green btn-sm"  onClick={exportNums} style={{flex:1,justifyContent:'center'}}><Download size={13}/> Export .txt</button>
              </div>
              <div style={{marginTop:10,padding:8,borderRadius:8,background:'var(--bg-raised)',maxHeight:80,overflowY:'auto'}}>
                {filt.slice(0,4).map(c=>(
                  <div key={c.id} style={{fontSize:10,color:'var(--text-secondary)',fontFamily:'monospace',marginBottom:1}}>{c.phone} — {c.fullName}</div>
                ))}
                {filt.length>4 && <div style={{fontSize:10,color:'var(--text-muted)'}}>+{filt.length-4} more…</div>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Message */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:14,fontWeight:700}}>✍️ Step 2 — Write Your Message</div>

            <div style={{marginBottom:12}}>
              <label>Broadcast Name (for records)</label>
              <input placeholder="e.g. Level 200 Rally Invite" value={bcastName} onChange={e=>setBcastName(e.target.value)}/>
            </div>

            <div style={{marginBottom:12}}>
              <label>Start from Template</label>
              <select value={tmplIdx} onChange={e=>{const i=parseInt(e.target.value);setTmplIdx(i);if(i>=0)setMessage(STARTER_TEMPLATES[i].body);}}>
                <option value={-1}>— Write from scratch —</option>
                {STARTER_TEMPLATES.map((t,i)=><option key={i} value={i}>{t.name}</option>)}
              </select>
            </div>

            <div style={{marginBottom:8}}>
              <label>Personalisation Tags (click to insert)</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                {MERGE_TAGS.map(({token,desc})=>(
                  <button key={token} type="button" onClick={()=>setMessage(m=>m+token)}
                    style={{padding:'4px 10px',borderRadius:6,background:'var(--bg-raised)',border:'1px solid var(--border)',color:'var(--gold)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'monospace'}}>
                    {token} <span style={{color:'var(--text-muted)',fontFamily:'var(--font-body)',fontWeight:400}}>({desc})</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea placeholder="Write your message. Use {{firstName}} to personalise." value={message} onChange={e=>setMessage(e.target.value)} style={{minHeight:150,fontSize:13,lineHeight:1.7}}/>
            <div style={{fontSize:11,color:'var(--text-muted)',textAlign:'right',marginTop:4}}>{message.length} chars</div>

            {/* Schedule toggle */}
            <div style={{marginTop:14,padding:'12px 14px',borderRadius:10,background:'var(--bg-raised)',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:scheduled?12:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Clock size={13} color="var(--purple)"/>
                  <span style={{fontSize:13,fontWeight:600}}>Schedule this broadcast</span>
                </div>
                <button type="button" onClick={()=>setScheduled(v=>!v)} style={{width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',position:'relative',background:scheduled?'var(--purple)':'var(--bg-card)',transition:'background .2s'}}>
                  <div style={{position:'absolute',top:2,left:scheduled?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
                </button>
              </div>
              {scheduled && (
                <div className="grid-2" style={{gap:10}}>
                  <div><label>Date</label><input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/></div>
                  <div><label>Time</label><input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)}/></div>
                </div>
              )}
            </div>
          </div>

          {/* Live preview */}
          {message && filt.length>0 && (
            <div className="card" style={{border:'1px solid rgba(0,208,132,.2)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}><Eye size={14} color="var(--green)"/><span style={{fontWeight:700,fontSize:13}}>Live Preview</span></div>
                <button className="btn btn-ghost btn-xs" onClick={()=>{const i=filt.indexOf(preview);setPreview(filt[(i+1)%filt.length]);}}>
                  <RefreshCw size={11}/> Next
                </button>
              </div>
              <div style={{background:'#ECE5DD',borderRadius:12,padding:14}}>
                <div style={{maxWidth:'85%',background:'#fff',borderRadius:'0 12px 12px 12px',padding:'10px 12px',boxShadow:'0 1px 2px rgba(0,0,0,.15)',fontSize:13,lineHeight:1.6,color:'#111',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                  {personalise(message, prevContact||{fullName:'Kwame Asante',programme:'PE',level:'200',hostel:'Volta Hall'})}
                </div>
                <div style={{fontSize:10,color:'#667781',textAlign:'right',marginTop:4}}>For: {prevContact?.fullName||'Kwame Asante'}</div>
              </div>
              {prevContact && (
                <a href={`https://web.whatsapp.com/send?phone=${prevContact.phone}&text=${encodeURIComponent(personalise(message,prevContact))}`} target="_blank" rel="noreferrer"
                  className="btn btn-green btn-sm" style={{width:'100%',justifyContent:'center',marginTop:10,display:'flex'}}>
                  <MessageCircle size={13}/> Open WhatsApp Web for {prevContact.fullName?.split(' ')[0]}
                </a>
              )}
            </div>
          )}

          {/* Log it */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:'var(--text-primary)'}}>📝 Step 3 — Log the Broadcast</div>
            <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:14,lineHeight:1.6}}>
              After sending in WhatsApp, click below. The CRM will log this broadcast and mark {filt.filter(c=>c.status==='Not Contacted').length} "Not Contacted" people as "Contacted".
            </p>
            <button className="btn btn-gold" style={{width:'100%',justifyContent:'center'}} onClick={logBcast}
              disabled={saving||!message||!bcastName||filt.length===0}>
              <CheckCircle size={14}/> {saving?'Saving…':scheduled?`Schedule Broadcast`:`Log as Sent (${filt.length} contacts)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HISTORY ──────────────────────────────────────────────
function HistoryTab({ broadcasts }) {
  const [open, setOpen] = useState(null);
  const totalReach = broadcasts.reduce((s,b)=>s+(b.recipientCount||0),0);

  return (
    <div>
      <div className="grid-3" style={{marginBottom:20}}>
        {[
          {label:'Total Broadcasts',val:broadcasts.length,colour:'var(--green)'},
          {label:'Total Recipients',val:totalReach,colour:'var(--blue)'},
          {label:'Scheduled',val:broadcasts.filter(b=>b.status==='Scheduled').length,colour:'var(--purple)'},
        ].map(s=>(
          <div key={s.label} className="card" style={{textAlign:'center'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:800,color:s.colour}}>{s.val}</div>
            <div style={{fontSize:12,color:'var(--text-secondary)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {broadcasts.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px 20px',color:'var(--text-muted)'}}>
          <History size={36} style={{margin:'0 auto 12px',display:'block',opacity:.3}}/>
          No broadcasts yet.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {broadcasts.map(b=>(
            <div key={b.id} className="card" style={{padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:14}}>{b.name}</span>
                    <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:b.status==='Sent'?'var(--green-glow)':'rgba(139,92,246,.12)',color:b.status==='Sent'?'var(--green)':'var(--purple)'}}>{b.status}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{b.recipientCount} recipients · By {b.sentBy} · {b.sentAt?.toDate?.()?.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})||'—'}</div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={()=>setOpen(open===b.id?null:b.id)}>
                  {open===b.id?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                </button>
              </div>
              {open===b.id && (
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>MESSAGE</div>
                  <div style={{background:'var(--bg-raised)',borderRadius:8,padding:'10px 12px',fontSize:12,lineHeight:1.6,color:'var(--text-secondary)',whiteSpace:'pre-wrap',maxHeight:120,overflowY:'auto'}}>{b.message}</div>
                  {b.filters && Object.entries(b.filters).some(([,v])=>v) && (
                    <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:6}}>
                      {Object.entries(b.filters).filter(([,v])=>v).map(([k,v])=>(
                        <span key={k} style={{padding:'2px 8px',borderRadius:6,background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:11}}>{k}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── IMPORT ───────────────────────────────────────────────
function ImportTab() {
  const { currentUser, userProfile } = useAuth();
  const [step,      setStep]     = useState(1);
  const [parsed,    setParsed]   = useState([]);
  const [headers,   setHeaders]  = useState([]);
  const [mapping,   setMapping]  = useState({});
  const [importing, setImporting]= useState(false);
  const [imported,  setImported] = useState(0);
  const [fileName,  setFileName] = useState('');
  const fileRef = useRef();

  const CRM_FIELDS = [
    {key:'fullName',label:'Full Name',required:true},
    {key:'phone',label:'Phone Number',required:true},
    {key:'programme',label:'Programme',required:false},
    {key:'level',label:'Level',required:false},
    {key:'hostel',label:'Hostel',required:false},
    {key:'supportLevel',label:'Support Level',required:false},
    {key:'notes',label:'Notes',required:false},
  ];

  function autoMap(hdrs) {
    const guesses = {
      fullName:    ['name','full name','fullname','student','contact'],
      phone:       ['phone','mobile','tel','number'],
      programme:   ['programme','program','dept','course'],
      level:       ['level','year','class'],
      hostel:      ['hostel','hall','residence'],
      supportLevel:['support','stance'],
      notes:       ['notes','remarks','comment'],
    };
    const map = {};
    CRM_FIELDS.forEach(({key})=>{
      const g=guesses[key];
      const m=hdrs.find(h=>g.some(x=>h.toLowerCase().includes(x)));
      if(m) map[key]=m;
    });
    setMapping(map);
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return toast.error('File appears empty');
      const hdrs = lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
      const rows = lines.slice(1).map(l=>{
        const vals=l.split(',').map(v=>v.trim().replace(/"/g,''));
        const obj={};
        hdrs.forEach((h,i)=>{obj[h]=vals[i]||'';});
        return obj;
      }).filter(r=>Object.values(r).some(Boolean));
      setHeaders(hdrs); setParsed(rows); autoMap(hdrs); setStep(2);
    };
    reader.readAsText(f);
  }

  async function runImport() {
    const missing = CRM_FIELDS.filter(f=>f.required&&!mapping[f.key]).map(f=>f.label);
    if (missing.length) return toast.error('Map required: '+missing.join(', '));
    setImporting(true);
    let count=0;
    const batch = writeBatch(db);
    let bs=0;
    for (const row of parsed) {
      let phone=(row[mapping.phone]||'').replace(/[\s-]/g,'');
      if (phone.startsWith('0')) phone='233'+phone.slice(1);
      else if (!phone.startsWith('233')) phone='233'+phone;
      const data={
        fullName:(row[mapping.fullName]||'').trim(),phone,
        programme:mapping.programme?(row[mapping.programme]||'').trim():'',
        level:mapping.level?(row[mapping.level]||'').trim():'',
        hostel:mapping.hostel?(row[mapping.hostel]||'').trim():'',
        supportLevel:mapping.supportLevel?(row[mapping.supportLevel]||'').trim():'',
        notes:mapping.notes?(row[mapping.notes]||'').trim():'',
        tags:[],volunteer:false,status:'Not Contacted',
        assignedTo:currentUser.uid,assignedToName:userProfile?.name||'Import',
        dateAdded:serverTimestamp(),lastContactDate:null,
      };
      if (!data.fullName||!data.phone) continue;
      batch.set(doc(collection(db,'contacts')),data);
      count++; bs++;
      if (bs===490){await batch.commit();bs=0;}
    }
    if (bs>0) await batch.commit();
    setImported(count); setStep(4); setImporting(false);
    toast.success(`${count} contacts imported! 🎉`);
  }

  function reset(){setStep(1);setParsed([]);setHeaders([]);setMapping({});setImported(0);setFileName('');}

  function downloadTemplate(){
    const csv='Full Name,Phone,Programme,Level,Hostel,Support Level,Notes\nKwame Asante,0244123456,PE,200,Volta Hall,Strong,Very enthusiastic\n';
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='spets-import-template.csv'; a.click();
  }

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <FileSpreadsheet size={15} color="var(--gold)"/>
        <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>Import from CSV / Excel</span>
      </div>

      {/* Step indicator */}
      <div style={{display:'flex',gap:0,marginBottom:24}}>
        {['Upload','Map Fields','Preview','Done'].map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center'}}>
              {i>0&&<div style={{flex:1,height:2,background:step>i?'var(--gold)':'var(--border)'}}/>}
              <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:step>i+1?'var(--green)':step===i+1?'var(--gold)':'var(--bg-raised)',color:step>=i+1?'#080C12':'var(--text-muted)',fontSize:11,fontWeight:800,flexShrink:0}}>
                {step>i+1?'✓':i+1}
              </div>
              {i<3&&<div style={{flex:1,height:2,background:step>i+1?'var(--gold)':'var(--border)'}}/>}
            </div>
            <div style={{fontSize:10,color:step===i+1?'var(--gold)':'var(--text-muted)',marginTop:5,fontWeight:600}}>{s}</div>
          </div>
        ))}
      </div>

      {step===1&&(
        <div>
          <div style={{border:'2px dashed var(--border)',borderRadius:14,padding:'40px 20px',textAlign:'center',cursor:'pointer'}} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){fileRef.current.files=e.dataTransfer.files;handleFile({target:{files:[f]}});}}}>
            <FileSpreadsheet size={40} style={{color:'var(--text-muted)',margin:'0 auto 12px',display:'block'}}/>
            <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,marginBottom:6}}>Drop your CSV file here</div>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>or click to choose a .csv file</div>
            <button className="btn btn-gold btn-sm" type="button" style={{pointerEvents:'none'}}>Choose File</button>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}} onChange={handleFile}/>
          </div>
          <div style={{marginTop:16,padding:'12px 14px',borderRadius:10,background:'var(--bg-raised)',fontSize:12,color:'var(--text-secondary)'}}>
            <strong style={{color:'var(--text-primary)'}}>Need a template?</strong> Your CSV should have columns like:
            <code style={{display:'block',marginTop:6,padding:'6px 10px',background:'var(--bg-card)',borderRadius:6,fontSize:11,color:'var(--gold)',fontFamily:'monospace'}}>Full Name, Phone, Programme, Level, Hostel, Support Level, Notes</code>
            <button className="btn btn-ghost btn-xs" style={{marginTop:8}} onClick={downloadTemplate}><Download size={11}/> Download blank template</button>
          </div>
        </div>
      )}

      {step===2&&(
        <div>
          <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}><strong style={{color:'var(--gold)'}}>{parsed.length} rows</strong> found in "{fileName}". Match columns below.</p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {CRM_FIELDS.map(({key,label,required})=>(
              <div key={key} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:120,fontSize:13,fontWeight:600,flexShrink:0}}>{label}{required&&<span style={{color:'var(--red)'}}> *</span>}</div>
                <select value={mapping[key]||''} onChange={e=>setMapping(m=>({...m,[key]:e.target.value}))} style={{flex:1}}>
                  <option value="">— Skip —</option>
                  {headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                {mapping[key]&&<span style={{fontSize:11,color:'var(--green)',flexShrink:0}}>✓</span>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button className="btn btn-ghost" onClick={reset}>← Back</button>
            <button className="btn btn-gold" onClick={()=>setStep(3)}>Preview →</button>
          </div>
        </div>
      )}

      {step===3&&(
        <div>
          <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:14}}>Importing <strong style={{color:'var(--gold)'}}>{parsed.length} contacts</strong>. Sample below:</p>
          <div className="table-wrap" style={{marginBottom:16}}>
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Programme</th><th>Level</th><th>Hostel</th></tr></thead>
              <tbody>
                {parsed.slice(0,6).map((r,i)=>(
                  <tr key={i}>
                    <td>{r[mapping.fullName]||'—'}</td>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{r[mapping.phone]||'—'}</td>
                    <td>{mapping.programme?r[mapping.programme]:'—'}</td>
                    <td>{mapping.level?r[mapping.level]:'—'}</td>
                    <td>{mapping.hostel?r[mapping.hostel]:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.length>6&&<p style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>+{parsed.length-6} more rows</p>}
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" onClick={()=>setStep(2)}>← Back</button>
            <button className="btn btn-gold" onClick={runImport} disabled={importing}>
              {importing?'Importing…':<><CheckCircle size={13}/> Import {parsed.length} contacts</>}
            </button>
          </div>
        </div>
      )}

      {step===4&&(
        <div style={{textAlign:'center',padding:'30px 20px'}}>
          <CheckCircle size={52} color="var(--green)" style={{margin:'0 auto 16px',display:'block'}}/>
          <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:800,color:'var(--green)',marginBottom:8}}>{imported} contacts imported!</div>
          <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:20}}>They're now in your Contacts page, assigned to you.</p>
          <button className="btn btn-gold" onClick={reset}>Import Another File</button>
        </div>
      )}
    </div>
  );
}

// ── SMS FALLBACK ─────────────────────────────────────────
function SmsTab({ contacts }) {
  const [username, setUsername] = useState('');
  const [apiKey,   setApiKey]   = useState('');
  const [message,  setMessage]  = useState('');
  const [filter,   setFilter]   = useState({programme:'',level:''});
  const [sending,  setSending]  = useState(false);

  const recipients = useMemo(()=>{
    let l=contacts;
    if(filter.programme) l=l.filter(c=>c.programme===filter.programme);
    if(filter.level)     l=l.filter(c=>c.level===filter.level);
    return l.filter(c=>c.phone);
  },[contacts,filter]);

  async function sendSMS(){
    if(!apiKey||!username) return toast.error("Enter Africa's Talking credentials first");
    if(!message.trim()) return toast.error('Write your message');
    if(!recipients.length) return toast.error('No recipients');
    setSending(true);
    try {
      const resp = await fetch('https://api.africastalking.com/version1/messaging',{
        method:'POST',
        headers:{'apiKey':apiKey,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
        body:new URLSearchParams({username,to:recipients.map(c=>c.phone).join(','),message:message.slice(0,160)}),
      });
      const data=await resp.json();
      if(data.SMSMessageData) toast.success(`SMS sent to ${recipients.length} contacts!`);
      else toast.error('API error: '+JSON.stringify(data));
    } catch { toast.error("Could not reach Africa's Talking. Check credentials."); }
    setSending(false);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(240,165,0,.06)',border:'1px solid rgba(240,165,0,.2)'}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>📱 SMS via Africa's Talking</div>
        <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>
          For contacts who don't have WhatsApp. Africa's Talking is the leading SMS API in Ghana — free trial at{' '}
          <a href="https://africastalking.com" target="_blank" rel="noreferrer" style={{color:'var(--gold)'}}>africastalking.com</a>.
          Create a free account, go to Settings → API Key, and paste it below.
        </p>
        <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>
          <a href="https://account.africastalking.com/auth/register" target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">Create Free Account →</a>
          <a href="https://developers.africastalking.com/docs/sms/sending" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">API Docs</a>
        </div>
      </div>

      <div className="grid-2" style={{alignItems:'start'}}>
        <div className="card">
          <div style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,marginBottom:14}}>🔑 Credentials</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label>Username</label><input placeholder="Your AT username" value={username} onChange={e=>setUsername(e.target.value)}/></div>
            <div><label>API Key</label><input type="password" placeholder="Paste your API key" value={apiKey} onChange={e=>setApiKey(e.target.value)}/></div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>⚠️ For testing, use username: <code style={{color:'var(--gold)'}}>sandbox</code> with your sandbox key.</div>
          </div>
        </div>

        <div className="card">
          <div style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,marginBottom:14}}>✍️ SMS Message</div>
          <div className="grid-2" style={{marginBottom:12}}>
            <div><label>Programme</label>
              <select value={filter.programme} onChange={e=>setFilter(f=>({...f,programme:e.target.value}))}>
                <option value="">All</option>{PROGRAMMES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label>Level</label>
              <select value={filter.level} onChange={e=>setFilter(f=>({...f,level:e.target.value}))}>
                <option value="">All</option>{LEVELS.map(l=><option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:'var(--bg-raised)',fontSize:13}}>
            <strong style={{color:'var(--blue)'}}>{recipients.length}</strong><span style={{color:'var(--text-secondary)'}}> recipients</span>
          </div>
          <textarea placeholder="Max 160 characters. Keep it short." value={message} onChange={e=>setMessage(e.target.value.slice(0,160))} style={{minHeight:90}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:4,marginBottom:12}}>
            <span style={{fontSize:11,color:message.length>140?'var(--red)':'var(--text-muted)'}}>{message.length}/160</span>
          </div>
          <button className="btn btn-green" style={{width:'100%',justifyContent:'center'}} onClick={sendSMS} disabled={sending}>
            <Send size={14}/> {sending?'Sending…':`Send SMS to ${recipients.length} contacts`}
          </button>
        </div>
      </div>
    </div>
  );
}