# Fix Syllabus Parsing Error

## Common Causes

The "parsing failed" or "Failed to send a request to the Edge Function" error usually happens due to one of these issues:

### 1. Edge Function Not Deployed ⚠️ (MOST COMMON - "Failed to send request")

**If you see "Failed to send a request to the Edge Function":**
- The edge function hasn't been deployed to Supabase yet
- **Solution**: See `DEPLOY_EDGE_FUNCTIONS.md` for step-by-step deployment instructions
- **Quick fix**: Deploy using Supabase CLI: `supabase functions deploy parse-syllabus`

### 2. Missing Edge Function Environment Variables ⚠️

The `parse-syllabus` edge function needs these environment variables set in Supabase:

1. **Go to Supabase Dashboard** → Your Project
2. **Click Edge Functions** in the left sidebar
3. **Click Settings** (or find Environment Variables section)
4. **Add these three variables:**

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
LOVABLE_API_KEY=your-lovable-api-key-here
```

**Where to find:**
- `SUPABASE_URL`: Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → Service Role Key (⚠️ secret!)
- `LOVABLE_API_KEY`: Your Lovable project settings

### 2. Check Browser Console

After uploading, check the browser console (F12) for the actual error message. The improved error handling will now show:
- Specific error messages
- Which environment variable is missing
- AI parsing errors
- Database errors

### 3. Check Supabase Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `parse-syllabus` function
3. Click **Logs** tab
4. Look for error messages with details

## Quick Fix Steps

1. **Set environment variables** in Supabase Edge Functions (see above)
2. **Try uploading again**
3. **Check browser console** for specific error
4. **Check Supabase logs** if still failing

## Error Messages You Might See

### "LOVABLE_API_KEY environment variable is not set"
- **Fix**: Add `LOVABLE_API_KEY` to Edge Functions environment variables

### "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
- **Fix**: Add `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions environment variables

### "AI returned invalid JSON format"
- **Fix**: The AI might have returned malformed JSON. Try uploading a different PDF or check if the PDF is readable

### "Failed to download file"
- **Fix**: Check that the file was uploaded successfully to Supabase Storage

### "Parsing timed out after 3 minutes"
- **Fix**: The PDF might be too large or complex. Try a smaller PDF or check Supabase logs

### "Failed to send a request to the Edge Function"
- **Fix**: The edge function is not deployed. See `DEPLOY_EDGE_FUNCTIONS.md` for deployment instructions
- **Quick check**: Go to Supabase Dashboard → Edge Functions. If `parse-syllabus` is not in the list, it needs to be deployed

## How to Check if Function is Deployed

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Look for `parse-syllabus` in the list
3. If it's **not there**, you need to deploy it (see `DEPLOY_EDGE_FUNCTIONS.md`)
4. If it **is there**, check:
   - Click on it → **Logs** tab for errors
   - **Settings** → Environment Variables are set

## Testing

After setting environment variables:
1. Upload a PDF again
2. Check browser console for any errors
3. Check Supabase Edge Function logs
4. You should see success message with counts of topics/assignments created

## Still Having Issues?

1. **Check all environment variables are set** in Supabase Edge Functions
2. **Verify your Supabase project is active** (not paused)
3. **Check your Lovable API key is valid**
4. **Try a simple PDF** to test if it's a PDF-specific issue
5. **Share the exact error message** from browser console or Supabase logs

