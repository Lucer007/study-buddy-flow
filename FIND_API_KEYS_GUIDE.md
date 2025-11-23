# Where to Find Your Supabase API Keys

## Step-by-Step Visual Guide

### Step 1: Go to Supabase Dashboard
1. Visit: **https://app.supabase.com**
2. Sign in with your account

### Step 2: Select Your Project
- Click on your project name in the left sidebar
- If you don't have a project, click **"New Project"** and create one

### Step 3: Navigate to API Settings
1. Look at the **left sidebar** in your Supabase dashboard
2. Click on the **⚙️ Settings** icon (gear icon) at the bottom
3. In the settings menu, click **"API"**

### Step 4: Find Your Credentials

You'll see a page with several sections. Here's what you need:

#### 📍 **Project URL** (for `VITE_SUPABASE_URL`)
- Look for the section labeled **"Project URL"** or **"Config"**
- You'll see something like:
  ```
  https://abcdefghijklmnop.supabase.co
  ```
- **Copy this entire URL** (including `https://`)

#### 🔑 **anon public key** (for `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Look for the section labeled **"Project API keys"** or **"API Keys"**
- Find the key labeled **"anon"** or **"anon public"**
- It's a very long string that looks like:
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzIwMCwiZXhwIjoxOTU0NTQzMjAwfQ.example-key-continues-here
  ```
- **Copy this entire key** (it's very long, make sure you get it all)

### Step 5: Update Your .env File

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-anon-key-here
```

**Example of what it should look like:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzIwMCwiZXhwIjoxOTU0NTQzMjAwfQ.example-key-continues-here
```

## Visual Layout Reference

```
Supabase Dashboard
├── Left Sidebar
│   ├── Table Editor
│   ├── SQL Editor
│   ├── Authentication
│   ├── Storage
│   ├── Edge Functions
│   └── ⚙️ Settings  ← Click here
│       ├── General
│       ├── API       ← Click here
│       ├── Database
│       └── ...
│
└── Main Content Area (when on API page)
    ├── Project URL
    │   └── https://xxxxx.supabase.co  ← Copy this
    │
    └── Project API keys
        ├── anon public  ← Copy this one
        ├── service_role (⚠️ Don't use this in frontend!)
        └── ...
```

## Important Notes

### ✅ Use the "anon public" key
- This is safe to use in frontend code
- It's designed to be public
- It respects Row Level Security (RLS) policies

### ❌ Don't use the "service_role" key
- This key bypasses all security
- Only use it in backend/edge functions
- Never put it in your `.env` file for frontend

### ✅ Make sure you copy the entire key
- The anon key is very long (usually 200+ characters)
- Make sure you copy it completely
- No spaces or line breaks

## Quick Checklist

- [ ] Opened Supabase Dashboard
- [ ] Selected my project
- [ ] Clicked Settings → API
- [ ] Copied Project URL
- [ ] Copied anon public key (not service_role!)
- [ ] Updated `.env` file with both values
- [ ] Saved the `.env` file
- [ ] Restarted dev server

## After Updating .env

1. **Save the `.env` file**
2. **Restart your development server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   # or
   bun dev
   ```
3. **Test the connection** - Open your app and check browser console for errors

## Need Help?

If you can't find the API keys:
1. Make sure you're in the correct project
2. Check that you clicked Settings → API (not just Settings)
3. Look for "Project URL" and "Project API keys" sections
4. The keys might be hidden - look for a "Show" or "Reveal" button

