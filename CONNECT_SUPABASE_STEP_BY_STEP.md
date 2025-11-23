# Step-by-Step: Connect to Supabase Database

## Step 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in (or create an account if you don't have one)

2. **Select or Create a Project**
   - If you have a project, select it
   - If not, click "New Project" and create one
   - Wait for the project to finish setting up (2-3 minutes)

3. **Get Your API Keys**
   - In your project dashboard, click **Settings** (gear icon) in the left sidebar
   - Click **API** in the settings menu
   - You'll see two important values:
     - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
     - **anon public** key (a long string starting with `eyJ...`)

## Step 2: Create Your .env File

1. **In your project root** (same folder as `package.json`), create a file named `.env`

2. **Copy this template** and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
```

3. **Replace the placeholders** with your actual values from Step 1

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzIwMCwiZXhwIjoxOTU0NTQzMjAwfQ.example-key-here
```

## Step 3: Verify Your .env File

Your `.env` file should:
- ✅ Be in the root directory (same level as `package.json`)
- ✅ Have no spaces around the `=` sign
- ✅ Have no quotes around the values (unless they contain spaces)
- ✅ Start with `VITE_` prefix (required for Vite to expose them)

## Step 4: Restart Your Development Server

**Important:** Environment variables are only loaded when the server starts!

1. **Stop your dev server** (if running): Press `Ctrl+C` in the terminal
2. **Start it again:**
   ```bash
   npm run dev
   # or
   bun dev
   ```

## Step 5: Test the Connection

1. **Open your app** in the browser (usually http://localhost:5173)
2. **Open browser console** (F12 or Right-click → Inspect → Console)
3. **Check for errors:**
   - ✅ No error = Connection successful!
   - ❌ "Missing Supabase environment variables" = Check your .env file
   - ❌ "Invalid API key" = Double-check your keys

## Step 6: Verify Database Connection

Try signing up or logging in:
1. Go to your app's login/signup page
2. Try creating an account
3. If it works, your database connection is working! 🎉

## Troubleshooting

### Error: "Missing Supabase environment variables"
- ✅ Check that `.env` file exists in project root
- ✅ Check that variable names start with `VITE_`
- ✅ Restart your dev server after creating/editing `.env`

### Error: "Invalid API key"
- ✅ Make sure you're using the **anon/public** key (not service role key)
- ✅ Copy the entire key (it's very long)
- ✅ Check for extra spaces or line breaks

### Error: "Failed to fetch" or CORS error
- ✅ Check your Supabase project is active (not paused)
- ✅ Verify the Project URL is correct
- ✅ Check Supabase Dashboard → Settings → API → CORS settings

### Still having issues?
1. Check browser console for specific error messages
2. Verify your Supabase project is running (check dashboard)
3. Make sure you restarted the dev server after creating `.env`

## Quick Checklist

- [ ] Created Supabase account
- [ ] Created/selected a project
- [ ] Got Project URL from Settings → API
- [ ] Got anon/public key from Settings → API
- [ ] Created `.env` file in project root
- [ ] Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Restarted dev server
- [ ] Tested connection (no console errors)

## Next Steps

Once connected:
1. **Set up your database schema** - Run `COMPLETE_SETUP.sql` in Supabase SQL Editor
2. **Apply indexes** - Run `20251124000000_optimize_queries_indexes.sql` for performance
3. **Test authentication** - Try signing up/logging in
4. **Test database queries** - Create a class, upload a syllabus, etc.

