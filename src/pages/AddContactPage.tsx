import { useState } from 'react';
import type { FormEvent, JSX, ReactNode } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  PROGRAMMES,
  LEVELS,
  HOSTELS,
  SUPPORT_LEVELS,
  CHARACTER_TAGS,
} from '../constants';
import { UserPlus, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ContactStatus =
  | 'Not Contacted'
  | 'Contacted'
  | 'Interested'
  | 'Not Interested';

interface ContactForm {
  fullName: string;
  phone: string;
  programme: string;
  level: string;
  hostel: string;
  supportLevel: string;
  volunteer: boolean;
  notes: string;
  tags: string[];
}

interface ContactDocument {
  fullName: string;
  phone: string;
  programme: string;
  level: string;
  hostel: string;
  supportLevel: string;
  volunteer: boolean;
  notes: string;
  tags: string[];
  status: ContactStatus;
  assignedTo: string;
  assignedToName: string;
  dateAdded: Timestamp;
  lastContactDate: Timestamp | null;
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface FieldProps {
  label: string;
  children: ReactNode;
}


// ─────────────────────────────────────────────
// Blank Form
// ─────────────────────────────────────────────

const BLANK: ContactForm = {
  fullName: '',
  phone: '',
  programme: '',
  level: '',
  hostel: '',
  supportLevel: '',
  volunteer: false,
  notes: '',
  tags: [],
};


// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function AddContactPage(): JSX.Element {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<ContactForm>(BLANK);
  const [loading, setLoading] = useState<boolean>(false);

  // Strongly typed field setter
  function field<K extends keyof ContactForm>(
    key: K,
    value: ContactForm[K]
  ): void {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleTag(tag: string): void {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter(t => t !== tag)
        : [...f.tags, tag],
    }));
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();

    if (!form.fullName || !form.phone || !form.programme || !form.level) {
      toast.error('Name, Phone, Programme and Level are required');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in.');
      return;
    }

    setLoading(true);

    try {
      // Normalize Ghana number → 233XXXXXXXXX
      let phone = form.phone.replace(/[\s-]/g, '');

      if (phone.startsWith('0')) {
        phone = '233' + phone.slice(1);
      }

      if (!phone.startsWith('233')) {
        phone = '233' + phone;
      }

      const contact: Omit<ContactDocument, 'dateAdded'> = {
        fullName: form.fullName.trim(),
        phone,
        programme: form.programme,
        level: form.level,
        hostel: form.hostel,
        supportLevel: form.supportLevel,
        volunteer: form.volunteer,
        notes: form.notes.trim(),
        tags: form.tags,
        status: 'Not Contacted',
        assignedTo: currentUser.uid,
        assignedToName: userProfile?.name ?? 'Unknown',
        lastContactDate: null,
      };

      await addDoc(collection(db, 'contacts'), {
        ...contact,
        dateAdded: serverTimestamp(),
      });

      toast.success(`${form.fullName} added! ✅`);
      setForm(BLANK);
    } catch (error) {
      console.error(error);
      toast.error('Save failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Contact</h1>
          <p className="page-subtitle">
            Record a supporter, potential volunteer, or prospect
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate('/contacts')}
          type="button"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Personal */}
        <Section title="Personal Information">
          <div className="form-grid">
            <Field label="Full Name *">
              <input
                placeholder="e.g. Kwame Asante"
                value={form.fullName}
                onChange={e => field('fullName', e.target.value)}
                required
              />
            </Field>

            <Field label="Phone Number *">
              <input
                placeholder="024 412 3456"
                value={form.phone}
                onChange={e => field('phone', e.target.value)}
                required
              />
            </Field>
          </div>
        </Section>

        {/* Academic */}
        <Section title="Academic Profile">
          <div className="form-grid-3">
            <Field label="Programme *">
              <select
                value={form.programme}
                onChange={e => field('programme', e.target.value)}
                required
              >
                <option value="">Select</option>
                {PROGRAMMES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <Field label="Level *">
              <select
                value={form.level}
                onChange={e => field('level', e.target.value)}
                required
              >
                <option value="">Select</option>
                {LEVELS.map(l => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
            </Field>

            <Field label="Hostel">
              <select
                value={form.hostel}
                onChange={e => field('hostel', e.target.value)}
              >
                <option value="">Select hostel</option>
                {HOSTELS.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* Campaign */}
        <Section title="Campaign Intelligence">
          <div className="form-grid">
            <Field label="Support Level">
              <select
                value={form.supportLevel}
                onChange={e => field('supportLevel', e.target.value)}
              >
                <option value="">Unknown</option>
                {SUPPORT_LEVELS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Volunteer?">
              <button
                type="button"
                onClick={() => field('volunteer', !form.volunteer)}
                className='p-3 rounded-md btn-sm flex flex-row items-center gap-2'
              >
                {form.volunteer
                  ? <CheckSquare size={16} />
                  : <Square size={16} />}
                {form.volunteer
                  ? ' Yes — will volunteer'
                  : ' Not a volunteer'}
              </button>
            </Field>
          </div>

          <div style={{ marginTop: 20 }}>
            <label>Character Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {CHARACTER_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className='btn btn-outline btn-sm'
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label>Short Notes</label>
            <textarea
              placeholder="Anything useful..."
              value={form.notes}
              onChange={e => field('notes', e.target.value)}
            />
          </div>
        </Section>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setForm(BLANK)}
          >
            Clear
          </button>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
          >
            <UserPlus size={15} />
            {loading ? ' Saving…' : ' Save Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}


// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function Section({ title, children }: SectionProps): JSX.Element {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 18,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: FieldProps): JSX.Element {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}