# How Supabase is Connected to This Project

## Overview

This project uses **Supabase** as its backend-as-a-service (BaaS) for:
- **Database** (PostgreSQL)
- **Authentication** (user sign-up, sign-in, sessions)
- **Storage** (file uploads like syllabi PDFs)
- **Edge Functions** (serverless functions for AI processing)

---

## 1. Frontend Connection (React App)

### Configuration File
**Location:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Reads from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Creates the Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key',
  {
    auth: {
      storage: localStorage,        // Stores auth tokens in browser
      persistSession: true,          // Keeps user logged in
      autoRefreshToken: true,        // Refreshes tokens automatically
      detectSessionInUrl: false,     // Prevents hanging on auth redirects
    }
  }
);
```

### How It's Used
**Import pattern throughout the app:**
```typescript
import { supabase } from "@/integrations/supabase/client";

// Example: Query database
const { data, error } = await supabase
  .from('classes')
  .select('*')
  .eq('user_id', user.id);

// Example: Authentication
await supabase.auth.signInWithPassword({ email, password });

// Example: File upload
await supabase.storage
  .from('syllabi')
  .upload('filename.pdf', file);
```

---

## 2. Environment Variables

### Required Variables
Create a `.env` file in the project root (or set in your hosting platform):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
```

### Where to Find These Values
1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Important Notes
- ⚠️ The **publishable key** is safe to expose in frontend code (it's public)
- 🔒 Never expose the **service role key** in frontend code (only for backend/edge functions)
- The `.env` file should be in `.gitignore` (don't commit secrets)

---

## 3. Authentication Context

**Location:** `src/contexts/AuthContext.tsx`

The app wraps the entire application with an `AuthProvider` that:
- Manages user authentication state
- Provides `user`, `session`, and `loading` to all components
- Handles sign-in, sign-out, and session persistence

**Usage in components:**
```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return <div>Welcome, {user.email}!</div>;
}
```

**Wrapped in App.tsx:**
```typescript
<AuthProvider>
  <BrowserRouter>
    {/* All your routes */}
  </BrowserRouter>
</AuthProvider>
```

---

## 4. Database Connection

### Database Tables
All database tables are defined in SQL migrations:
- **Location:** `supabase/migrations/`
- **Main setup:** `COMPLETE_SETUP.sql`

### Querying the Database
```typescript
// Select data
const { data, error } = await supabase
  .from('classes')
  .select('*')
  .eq('user_id', user.id);

// Insert data
const { data, error } = await supabase
  .from('classes')
  .insert({ name: 'Math 101', user_id: user.id });

// Update data
const { data, error } = await supabase
  .from('classes')
  .update({ name: 'Math 201' })
  .eq('id', classId)
  .eq('user_id', user.id); // RLS ensures user can only update their own data

// Delete data
const { data, error } = await supabase
  .from('classes')
  .delete()
  .eq('id', classId)
  .eq('user_id', user.id);
```

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only see/modify their own data
- Policies are defined in migration files

---

## 5. Storage Connection

### Storage Buckets
- **Syllabi bucket**: Stores uploaded PDF files
- Created in migration: `COMPLETE_SETUP.sql`

### Uploading Files
```typescript
// Upload a file
const { data, error } = await supabase.storage
  .from('syllabi')
  .upload(`${userId}/${filename}`, file);

// Get public URL
const { data } = supabase.storage
  .from('syllabi')
  .getPublicUrl(filePath);
```

---

## 6. Edge Functions (Backend)

**Location:** `supabase/functions/`

Edge functions are serverless Deno functions that run on Supabase's infrastructure.

### Available Functions
- `parse-syllabus` - Parses PDF syllabi using AI
- `create-demo-posts` - Generates demo study posts
- `class-tutor` - AI tutoring chat
- `chat-tutor` - General chat tutor
- `send-pinky-reminders` - Sends study reminders

### How They're Called
```typescript
// From frontend
const { data, error } = await supabase.functions.invoke('parse-syllabus', {
  body: {
    syllabusUrl: 'path/to/file.pdf',
    classId: 'uuid',
    userId: user.id,
    weekdayHours: 2,
    weekendHours: 3
  }
});
```

### Edge Function Environment Variables
Edge functions need their own environment variables set in Supabase Dashboard:
1. Go to **Edge Functions** → **Settings**
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, bypasses RLS)
   - `LOVABLE_API_KEY` (for AI features)

---

## 7. Type Safety

**Location:** `src/integrations/supabase/types.ts`

This file contains TypeScript types generated from your database schema. It provides:
- Autocomplete for table names
- Type safety for queries
- IntelliSense in your IDE

**Usage:**
```typescript
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// TypeScript knows the structure of your tables
const { data } = await supabase
  .from('classes')
  .select('*');
// data is typed as Database['public']['Tables']['classes']['Row'][]
```

---

## 8. Connection Flow Diagram

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │
         │ Uses: @supabase/supabase-js
         │
         ▼
┌─────────────────┐
│  Supabase Client│
│  (client.ts)     │
└────────┬────────┘
         │
         │ Connects via:
         │ - VITE_SUPABASE_URL
         │ - VITE_SUPABASE_PUBLISHABLE_KEY
         │
         ▼
┌─────────────────────────────────────┐
│      Supabase Cloud                 │
│  ┌──────────┐  ┌──────────┐        │
│  │ Database │  │  Storage │        │
│  │(Postgres)│  │  (Files)  │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │   Edge   │        │
│  │(Sessions)│  │ Functions│        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

---

## 9. Common Connection Issues

### Issue: "Missing Supabase environment variables"
**Solution:** Create `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### Issue: "Failed to fetch" or CORS errors
**Solution:** Check that your Supabase project allows requests from your domain

### Issue: "Invalid API key"
**Solution:** Verify you're using the **anon/public** key (not service role key) in frontend

### Issue: Edge functions timeout
**Solution:** Set environment variables in Supabase Dashboard → Edge Functions → Settings

---

## 10. Project Structure

```
study-buddy-flow/
├── src/
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          ← Main Supabase client
│   │       └── types.ts           ← TypeScript types
│   ├── contexts/
│   │   └── AuthContext.tsx        ← Auth state management
│   └── pages/                     ← All pages use supabase client
├── supabase/
│   ├── functions/                 ← Edge functions
│   └── migrations/                ← Database schema
└── .env                           ← Environment variables (not in git)
```

---

## Summary

1. **Frontend** connects via `src/integrations/supabase/client.ts`
2. **Environment variables** provide connection credentials
3. **AuthContext** manages authentication state
4. **Database** queries use the Supabase client
5. **Storage** handles file uploads
6. **Edge Functions** run serverless backend code
7. **TypeScript types** ensure type safety

The connection is **automatic** once environment variables are set. The Supabase client handles all the networking, authentication, and data synchronization behind the scenes.

