// src/pages/AnnouncementsPage.jsx
import { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Megaphone, Pin, Trash2, Plus, X,
  Upload, CheckCircle, AlertCircle, Download,
  FileSpreadsheet, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITIES = [
  { value:'urgent', label:'🔴 Urgent', colour:'var(--red)'   },
  { value:'high',   label:'🟠 High',   colour:'var(--gold)'  },
  { value:'normal', label:'🟢 Normal', colour:'var(--green)' },
  { value:'info',   label:'🔵 Info',   colour:'var(--blue)'  },
];
const BLANK = { title:'', body:'', priority:'normal', pinned:false };
const ALL_COLS = ['fullName','phone','programme','level','hostel','supportLevel','notes'];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { error:'File appears empty' };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']+|["']+$/g,''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^["']+|["']+$/g,''));
    if (vals.every(v=>!v)) continue;
    const row = {};
    headers.forEach((h,j) => { row[h] = vals[j] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

export default function AnnouncementsPage() {
  const { isAdmin, userProfile } = useAuth();
  const [tab, setTab] = useState('announcements');
  const TABS = [
    { id:'announcements', label:'Announcements',   icon:Megaphone       },
    { id:'import',        label:'Import Contacts', icon:FileSpreadsheet },
  ];
  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Board</h1>
          <p className="page-subtitle">Announcements, updates and contact imports</p>
        </div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:24,background:'var(--bg-raised)',padding:5,borderRadius:12,width:'fit-content'}}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            display:'flex',alignItems:'center',gap:7,padding:'8px 16px',
            borderRadius:9,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',
            fontSize:13,fontWeight:tab===id?700:500,transition:'all .15s',
            background:tab===id?'var(--bg-card)':'transparent',
            color:tab===id?'var(--gold)':'var(--text-secondary)',
            boxShadow:tab===id?'0 2px 8px rgba(0,0,0,.3)':'none',
          }}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>
      {tab==='announcements' && <AnnouncementsTab isAdmin={isAdmin} userProfile={userProfile}/>}
      {tab==='import'        && <ImportTab/>}
    </div>
  );
}

function AnnouncementsTab({ isAdmin, userProfile }) {
  const [posts,setPosts]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState(BLANK);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    return onSnapshot(
      query(collection(db,'announcements'),orderBy('createdAt','desc')),
      s=>setPosts(s.docs.map(d=>({id:d.id,...d.data()})))
    );
  },[]);

  const pinned  = posts.filter(p=>p.pinned);
  const regular = posts.filter(p=>!p.pinned);

  async function savePost(){
    if(!form.title.trim()||!form.body.trim()) return toast.error('Title and body required');
    setSaving(true);
    try {
      await addDoc(collection(db,'announcements'),{...form,author:userProfile?.name||'Admin',createdAt:serverTimestamp()});
      toast.success('Posted!');
      setForm(BLANK); setShowForm(false);
    } catch{ toast.error('Could not post'); }
    finally{ setSaving(false); }
  }

  async function togglePin(id,current){
    await updateDoc(doc(db,'announcements',id),{pinned:!current});
    toast.success(current?'Unpinned':'Pinned to top');
  }

  async function deletePost(id){
    await deleteDoc(doc(db,'announcements',id));
    toast.success('Deleted');
  }

  const prioMap = Object.fromEntries(PRIORITIES.map(p=>[p.value,p]));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {isAdmin && (!showForm?(
        <button className="btn btn-gold" onClick={()=>setShowForm(true)} style={{width:'fit-content'}}>
          <Plus size={14}/> Post Announcement
        </button>
      ):(
        <div className="card fade-up">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>New Announcement</span>
            <button className="btn btn-ghost btn-xs" onClick={()=>{setShowForm(false);setForm(BLANK);}}><X size={14}/></button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label>Title</label><input placeholder="e.g. Rally tomorrow 4pm" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div><label>Message</label><textarea placeholder="Details..." value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} style={{minHeight:100}}/></div>
            <div style={{display:'flex',gap:14}}>
              <div style={{flex:1}}>
                <label>Priority</label>
                <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  {PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{flex:1,display:'flex',alignItems:'flex-end',paddingBottom:1}}>
                <button onClick={()=>setForm(f=>({...f,pinned:!f.pinned}))} style={{
                  display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                  borderRadius:'var(--radius)',border:'1px solid',
                  borderColor:form.pinned?'var(--gold)':'var(--border)',
                  background:form.pinned?'var(--gold-glow)':'var(--bg-input)',
                  color:form.pinned?'var(--gold)':'var(--text-secondary)',
                  cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:600,width:'100%',
                }}>
                  <Pin size={13}/> {form.pinned?'Pinned':'Pin to top'}
                </button>
              </div>
            </div>
            <button className="btn btn-gold" onClick={savePost} disabled={saving} style={{justifyContent:'center'}}>
              <Megaphone size={14}/> {saving?'Posting…':'Post Now'}
            </button>
          </div>
        </div>
      ))}

      {pinned.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',letterSpacing:'.07em',marginBottom:8}}>📌 PINNED</div>
          {pinned.map(p=><PostCard key={p.id} post={p} prioMap={prioMap} isAdmin={isAdmin} onPin={togglePin} onDelete={deletePost}/>)}
        </div>
      )}
      {regular.length>0?(
        <div>
          {pinned.length>0&&<div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.07em',marginBottom:8}}>ALL POSTS</div>}
          {regular.map(p=><PostCard key={p.id} post={p} prioMap={prioMap} isAdmin={isAdmin} onPin={togglePin} onDelete={deletePost}/>)}
        </div>
      ):pinned.length===0&&(
        <div className="card" style={{textAlign:'center',padding:'50px 20px',color:'var(--text-muted)'}}>
          <Megaphone size={38} style={{margin:'0 auto 14px',display:'block',opacity:.3}}/>
          <p>No announcements yet.</p>
          {!isAdmin&&<p style={{fontSize:12,marginTop:6}}>Your admin will post updates here.</p>}
        </div>
      )}
    </div>
  );
}

function PostCard({post:p,prioMap,isAdmin,onPin,onDelete}){
  const prio=prioMap[p.priority]||prioMap.normal;
  const date=p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  return(
    <div style={{padding:'16px 18px',borderRadius:14,marginBottom:10,background:'var(--bg-raised)',border:`1px solid ${p.pinned?'rgba(240,165,0,.25)':'var(--border)'}`,borderLeft:`4px solid ${prio.colour}`}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
            {p.pinned&&<Pin size={12} color="var(--gold)"/>}
            <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>{p.title}</span>
            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${prio.colour}18`,color:prio.colour}}>{prio.label}</span>
          </div>
          <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{p.body}</p>
          <p style={{fontSize:11,color:'var(--text-muted)',marginTop:8}}>{p.author} · {date}</p>
        </div>
        {isAdmin&&(
          <div style={{display:'flex',gap:5,flexShrink:0}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>onPin(p.id,p.pinned)}><Pin size={11}/></button>
            <button className="btn btn-ghost btn-xs" onClick={()=>onDelete(p.id)}><Trash2 size={11}/></button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportTab(){
  const {currentUser,userProfile}=useAuth();
  const [file,setFile]=useState(null);
  const [parsed,setParsed]=useState(null);
  const [errors,setErrors]=useState([]);
  const [importing,setImporting]=useState(false);
  const [done,setDone]=useState(0);
  const fileRef=useRef();

  function handleFile(e){
    const f=e.target.files?.[0];
    if(!f) return;
    setFile(f);setParsed(null);setErrors([]);setDone(0);
    const reader=new FileReader();
    reader.onload=ev=>{
      const result=parseCSV(ev.target.result);
      if(result.error){toast.error(result.error);return;}
      const errs=[];
      result.rows.forEach((row,i)=>{
        if(!row.fullName) errs.push(`Row ${i+2}: missing fullName`);
        if(!row.phone)    errs.push(`Row ${i+2}: missing phone`);
      });
      setErrors(errs);setParsed(result);
    };
    reader.readAsText(f);
  }

  async function doImport(){
    if(!parsed||errors.length>0) return;
    setImporting(true);let count=0;
    try{
      for(const row of parsed.rows){
        let phone=(row.phone||'').replace(/[\s-]/g,'');
        if(phone.startsWith('0')) phone='233'+phone.slice(1);
        if(!phone.startsWith('233')) phone='233'+phone;
        await addDoc(collection(db,'contacts'),{
          fullName:row.fullName?.trim()||'',phone,
          programme:row.programme||'',level:row.level||'',
          hostel:row.hostel||'',supportLevel:row.supportLevel||'',
          notes:row.notes||'',volunteer:false,tags:[],
          status:'Not Contacted',assignedTo:currentUser.uid,
          assignedToName:userProfile?.name||'Import',
          dateAdded:serverTimestamp(),lastContactDate:null,
        });
        count++;setDone(count);
      }
      toast.success(`${count} contacts imported!`);
      setParsed(null);setFile(null);
      if(fileRef.current) fileRef.current.value='';
    }catch(err){toast.error('Import failed: '+err.message);}
    finally{setImporting(false);}
  }

  function downloadTemplate(){
    const csv=['fullName,phone,programme,level,hostel,supportLevel,notes','Kwame Asante,0241234567,PE,100,Volta Hall,Strong,Enthusiastic','Ama Owusu,0551234567,PG,200,Commonwealth Hall,Leaning,'].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='spets-import-template.csv';a.click();
    toast.success('Template downloaded');
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <FileSpreadsheet size={15} color="var(--blue)"/>
            <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>Import from CSV</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={downloadTemplate}><Download size={13}/> Template</button>
        </div>
        <div style={{padding:'12px 14px',borderRadius:10,background:'var(--bg-raised)',marginBottom:16,fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
          <strong style={{color:'var(--text-primary)'}}>How to import:</strong><br/>
          1. Download the template → fill in Excel or Google Sheets → Save As CSV<br/>
          2. Upload below → review preview → click Import<br/>
          <strong>Required:</strong> <code style={{color:'var(--gold)'}}>fullName</code>, <code style={{color:'var(--gold)'}}>phone</code>
        </div>
        <div onClick={()=>fileRef.current?.click()} style={{border:'2px dashed var(--border-soft)',borderRadius:14,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:'var(--bg-raised)'}}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f) handleFile({target:{files:e.dataTransfer.files}});}}>
          <Upload size={28} style={{color:'var(--text-muted)',margin:'0 auto 10px',display:'block'}}/>
          <p style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{file?file.name:'Click or drag CSV file here'}</p>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Supports .csv files</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:'none'}}/>
        </div>
      </div>

      {parsed&&(
        <div className="card fade-up">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700}}>Preview — {parsed.rows.length} rows</span>
            {errors.length>0
              ?<span style={{display:'flex',alignItems:'center',gap:6,color:'var(--red)',fontSize:12,fontWeight:700}}><AlertCircle size={14}/>{errors.length} error{errors.length>1?'s':''}</span>
              :<span style={{display:'flex',alignItems:'center',gap:6,color:'var(--green)',fontSize:12,fontWeight:700}}><CheckCircle size={14}/>Ready to import</span>
            }
          </div>
          {errors.length>0&&<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,77,109,.08)',border:'1px solid rgba(255,77,109,.2)',marginBottom:14}}>{errors.map((e,i)=><p key={i} style={{fontSize:12,color:'var(--red)'}}>{e}</p>)}</div>}
          <div className="table-wrap" style={{marginBottom:16}}>
            <table>
              <thead><tr>{parsed.headers.filter(h=>ALL_COLS.includes(h)).map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {parsed.rows.slice(0,5).map((row,i)=>(
                  <tr key={i}>{parsed.headers.filter(h=>ALL_COLS.includes(h)).map(h=><td key={h} style={{fontSize:12}}>{row[h]||<span style={{color:'var(--text-muted)'}}>—</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length>5&&<p style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>…and {parsed.rows.length-5} more rows</p>}
          {importing&&(
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-muted)',marginBottom:6}}><span>Importing…</span><span>{done}/{parsed.rows.length}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{width:`${parsed.rows.length?done/parsed.rows.length*100:0}%`,background:'var(--green)'}}/></div>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-ghost" onClick={()=>{setParsed(null);setFile(null);if(fileRef.current)fileRef.current.value='';}}>Cancel</button>
            <button className="btn btn-gold" onClick={doImport} disabled={errors.length>0||importing} style={{justifyContent:'center',flex:1}}>
              <Users size={14}/> {importing?`Importing ${done}/${parsed.rows.length}…`:`Import ${parsed.rows.length} Contacts`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}