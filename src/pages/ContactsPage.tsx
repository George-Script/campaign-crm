// src/pages/ContactsPage.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PROGRAMMES, LEVELS, HOSTELS, CONTACT_STATUSES, STATUS_BADGE, SUPPORT_BADGE } from '../constants';
import { MessageCircle, Trash2, Filter, X, Search, Users } from 'lucide-react';
import { Avatar } from '../component/AppLayout';
import toast from 'react-hot-toast';

const WA_MESSAGE = (name) =>
  `Hello ${name}, it was great meeting you! I'm part of the SPETS campaign and we'd love your support. Can we count on you? 🙏`;

function StatusDropdown({ contact, onUpdate }) {
  const [val, setVal] = useState(contact.status || 'Not Contacted');
  async function onChange(e) {
    const status = e.target.value;
    setVal(status);
    await onUpdate(contact.id, { status, lastContactDate: serverTimestamp() });
  }
  return (
    <select value={val} onChange={onChange} style={{
      background:'var(--bg-raised)', border:'1px solid var(--border)',
      borderRadius:7, color:'var(--text-primary)', fontSize:12,
      padding:'4px 8px', cursor:'pointer', minWidth:130,
    }}>
      {CONTACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function ContactsPage() {
  const { currentUser, isAdmin } = useAuth();
  const [contacts,       setContacts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [showFilters,    setShowFilters]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [filters, setFilters] = useState({
    programme:'', level:'', hostel:'', status:'', support:'', volunteer:'',
  });

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('dateAdded', 'desc'));
    return onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function updateContact(id, data) {
    try {
      await updateDoc(doc(db, 'contacts', id), data);
      toast.success('Saved ✓');
    } catch { toast.error('Could not update'); }
  }

  async function deleteContact(id) {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      toast.success('Deleted');
      setConfirmDelete(null);
    } catch { toast.error('Delete failed'); }
  }

  function openWhatsApp(phone, name) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(WA_MESSAGE(name))}`, '_blank');
  }

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })); }
  function clearAll()       { setFilters({ programme:'',level:'',hostel:'',status:'',support:'',volunteer:'' }); setSearch(''); }

  const filtered = useMemo(() => {
    let list = contacts;
    if (!isAdmin) list = list.filter(c => c.assignedTo === currentUser.uid);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.fullName?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.programme?.toLowerCase().includes(s) ||
        c.hostel?.toLowerCase().includes(s)
      );
    }
    if (filters.programme) list = list.filter(c => c.programme === filters.programme);
    if (filters.level)     list = list.filter(c => c.level     === filters.level);
    if (filters.hostel)    list = list.filter(c => c.hostel    === filters.hostel);
    if (filters.status)    list = list.filter(c => c.status    === filters.status);
    if (filters.support)   list = list.filter(c => c.supportLevel === filters.support);
    if (filters.volunteer) list = list.filter(c => c.volunteer === (filters.volunteer === 'yes'));
    return list;
  }, [contacts, search, filters, isAdmin, currentUser]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height:48, borderRadius:10, marginBottom:16 }}/>
      <div className="skeleton" style={{ height:400, borderRadius:14 }}/>
    </div>
  );

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'All Contacts' : 'My Contacts'}</h1>
          <p className="page-subtitle">
            Showing {filtered.length} of {isAdmin ? contacts.length : contacts.filter(c => c.assignedTo === currentUser.uid).length} contacts
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(v => !v)} style={{ position:'relative' }}>
            <Filter size={13}/> Filters
            {activeCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, width:17, height:17, borderRadius:'50%', background:'var(--gold)', color:'#080C12', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {activeCount}
              </span>
            )}
          </button>
          {(activeCount > 0 || search) && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll}><X size={13}/> Clear</button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:14 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input placeholder="Search name, phone, programme, hostel…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36 }}/>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card fade-up" style={{ marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
            {[
              { key:'programme', label:'Programme', opts: PROGRAMMES.map(p => ({ v:p, l:p })) },
              { key:'level',     label:'Level',     opts: LEVELS.map(l => ({ v:l, l:`Level ${l}` })) },
              { key:'hostel',    label:'Hostel',    opts: HOSTELS.map(h => ({ v:h, l:h })) },
              { key:'status',    label:'Status',    opts: CONTACT_STATUSES.map(s => ({ v:s, l:s })) },
              { key:'support',   label:'Support',   opts: [{ v:'Strong',l:'Strong' },{ v:'Leaning',l:'Leaning' },{ v:'Neutral',l:'Neutral' }] },
              { key:'volunteer', label:'Volunteer', opts: [{ v:'yes',l:'Volunteers only' },{ v:'no',l:'Non-volunteers' }] },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <label>{label}</label>
                <select value={filters[key]} onChange={e => setFilter(key, e.target.value)}>
                  <option value="">All</option>
                  {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'50px 20px' }}>
          <Users size={38} style={{ color:'var(--text-muted)', margin:'0 auto 14px' }}/>
          <p style={{ color:'var(--text-muted)' }}>No contacts match your search.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Programme</th>
                <th>Level</th>
                <th>Hostel</th>
                <th>Support</th>
                <th>Tags</th>
                {isAdmin && <th>Assigned To</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={c.fullName} index={i} size={30}/>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{c.fullName}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.phone}</div>
                        {c.volunteer && <span className="badge badge-green" style={{ fontSize:9, marginTop:3 }}>Volunteer</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{c.programme || '—'}</span></td>
                  <td style={{ fontWeight:600 }}>{c.level ? `Lvl ${c.level}` : '—'}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:12 }}>{c.hostel || '—'}</td>
                  <td>
                    {c.supportLevel
                      ? <span className={`badge badge-${SUPPORT_BADGE[c.supportLevel] || 'gray'}`}>{c.supportLevel}</span>
                      : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {(c.tags || []).map(t => (
                        <span key={t} style={{ padding:'2px 6px', borderRadius:4, background:'var(--bg-raised)', color:'var(--text-secondary)', fontSize:10, fontWeight:600 }}>{t}</span>
                      ))}
                      {(!c.tags || !c.tags.length) && <span style={{ color:'var(--text-muted)' }}>—</span>}
                    </div>
                  </td>
                  {isAdmin && <td style={{ color:'var(--text-secondary)', fontSize:12 }}>{c.assignedToName || '—'}</td>}
                  <td><StatusDropdown contact={c} onUpdate={updateContact}/></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-green btn-xs" onClick={() => openWhatsApp(c.phone, c.fullName)} title="WhatsApp">
                        <MessageCircle size={12}/>
                      </button>
                      {isAdmin && (
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(c.id)} title="Delete">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete modal */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(8,12,18,.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card fade-up" style={{ maxWidth:360, width:'100%', textAlign:'center' }}>
            <Trash2 size={34} style={{ color:'var(--red)', margin:'0 auto 14px' }}/>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8 }}>Delete this contact?</h3>
            <p style={{ color:'var(--text-secondary)', marginBottom:22 }}>This cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger"  onClick={() => deleteContact(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}