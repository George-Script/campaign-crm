# SPETS CRM — Setup Guide

## File Structure
```
spets-crm/
├── index.html
├── vite.config.js
├── package.json
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── firebase.js          ← your Firebase config goes here
    ├── constants.js         ← edit targets, programmes, hostels here
    ├── contexts/
    │   └── AuthContext.jsx
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── MemberHomePage.jsx    ← what members see after login
    │   ├── ContactsPage.jsx
    │   ├── AddContactPage.jsx
    │   ├── AdminDashboard.jsx    ← admin only
    │   └── TeamPage.jsx          ← admin only
    └── components/
        └── AppLayout.jsx         ← sidebar + Avatar helper
```

---

## Who sees what

| Page              | Member | Admin |
|-------------------|--------|-------|
| My Home (/home)   | ✅      | ✅     |
| Contacts          | ✅ (own only) | ✅ (all) |
| Add Contact       | ✅      | ✅     |
| Admin Dashboard   | ❌      | ✅     |
| Team              | ❌      | ✅     |

Members land on `/home` after login.  
Admins land on `/admin/dashboard` after login.

---

## Adjust member targets

Open `src/constants.js` and edit:

```js
export const MEMBER_TARGETS = {
  contacts:   50,   // change the contact goal
  strong:     15,   // strong supporters goal
  volunteers:  5,   // volunteers goal
};
```

The progress rings and motivation messages on the Member Home update automatically.

---

## Quick Start

### 1 — Create Firebase project
- https://console.firebase.google.com → New Project
- Enable **Authentication** → Email/Password
- Enable **Firestore Database** → Production mode (europe-west1 recommended)

### 2 — Paste your config
Open `src/firebase.js` and replace the placeholder values.

### 3 — Set Firestore rules
Firestore → Rules → paste this → Publish:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4 — Create your Admin account
Firebase Console → Authentication → Users → Add User  
Copy the UID → Firestore → teamMembers collection → New Doc  
Doc ID = your UID  
Fields:  name, email, role = "Admin"

### 5 — Run
```bash
npm install
npm run dev
```
Open http://localhost:5173 and login.

### 6 — Add team members
Login as Admin → Team tab → fill the form → Add Member.  
Members can log in immediately and will land on their personal Home screen.

---

## Build for production
```bash
npm run build
# deploy the dist/ folder to Firebase Hosting, Netlify, or Vercel
```