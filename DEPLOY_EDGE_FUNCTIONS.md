# How to Deploy Edge Functions to Supabase

## The Problem

"Failed to send a request to the Edge Function" means the function isn't deployed to Supabase yet. Edge functions need to be deployed separately from your code.

## Solution: Deploy Using Supabase CLI

### Step 1: Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using Scoop (recommended)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

**Mac/Linux:**
```bash
brew install supabase/tap/supabase
# Or
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```bash
# Link to your existing project
supabase link --project-ref yqwvwzpwwtpkolwnjkom
```

Replace `yqwvwzpwwtpkolwnjkom` with your actual project reference (found in Supabase Dashboard → Settings → General → Reference ID).

### Step 4: Deploy the Function

```bash
# Deploy just the parse-syllabus function
supabase functions deploy parse-syllabus

# Or deploy all functions
supabase functions deploy
```

### Step 5: Set Environment Variables

After deploying, set environment variables in Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings**
2. Add these variables:
   ```
   SUPABASE_URL=https://yqwvwzpwwtpkolwnjkom.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   LOVABLE_API_KEY=your-lovable-api-key
   ```

## Alternative: Deploy via Supabase Dashboard

If you don't want to use CLI:

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Click "Create a new function"**
3. **Name it:** `parse-syllabus`
4. **Copy the code** from `supabase/functions/parse-syllabus/index.ts`
5. **Paste it** into the editor
6. **Click Deploy**
7. **Set environment variables** (see Step 5 above)

## Verify Deployment

1. Go to **Supabase Dashboard** → **Edge Functions**
2. You should see `parse-syllabus` in the list
3. Click on it to see details and logs

## Troubleshooting

### "Command not found: supabase"
- Install Supabase CLI (see Step 1)

### "Project not found"
- Check your project reference ID in Supabase Dashboard
- Make sure you're logged in: `supabase login`

### "Permission denied"
- Make sure you're the project owner or have deployment permissions
- Check your Supabase account permissions

### Still getting "Failed to send request"
- Verify the function is deployed (check Supabase Dashboard)
- Check that the function name matches exactly: `parse-syllabus`
- Check browser console for more specific errors
- Verify your Supabase URL and keys are correct in `.env`

## Quick Checklist

- [ ] Installed Supabase CLI
- [ ] Logged in: `supabase login`
- [ ] Linked project: `supabase link --project-ref YOUR_PROJECT_ID`
- [ ] Deployed function: `supabase functions deploy parse-syllabus`
- [ ] Set environment variables in Supabase Dashboard
- [ ] Verified function appears in Dashboard → Edge Functions
- [ ] Tested upload again

