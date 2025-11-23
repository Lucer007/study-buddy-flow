# Deploy Edge Function via Supabase Dashboard

## Quick Steps

### Step 1: Go to Edge Functions
1. Open **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **Edge Functions** in the left sidebar

### Step 2: Create New Function
1. Click **"Create a new function"** button (or **"New Function"**)
2. **Function name**: `parse-syllabus` (must match exactly)
3. Click **Create**

### Step 3: Paste the Code
1. **Delete** the default template code (the "Hello" example)
2. **Open** the file `PARSE_SYLLABUS_FUNCTION_CODE.ts` from this project
3. **Copy the entire contents** (everything inside the file)
4. **Paste** it into the Supabase editor
5. **Click "Deploy"** or **"Save"**

### Step 4: Set Environment Variables
**CRITICAL:** After deploying, you MUST set environment variables:

1. In the Edge Functions page, click **Settings** (or find Environment Variables)
2. Add these three variables:

```
SUPABASE_URL=https://yqwvwzpwwtpkolwnjkom.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
LOVABLE_API_KEY=your-lovable-api-key-here
```

**Where to find:**
- `SUPABASE_URL`: Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → Service Role Key (⚠️ secret!)
- `LOVABLE_API_KEY`: Your Lovable project settings

### Step 5: Verify Deployment
1. Go back to **Edge Functions** list
2. You should see `parse-syllabus` in the list
3. Click on it to see details
4. Check the **Logs** tab (will be empty until you use it)

## Testing

1. Go to your app
2. Upload a PDF to a class
3. Check the **Logs** tab in the edge function to see if it's working
4. Check browser console for any errors

## Troubleshooting

**Function not showing up?**
- Make sure you clicked "Deploy" after pasting code
- Check the function name is exactly `parse-syllabus`

**Still getting "Failed to send request"?**
- Verify function is in the list
- Check environment variables are set
- Try refreshing the page

**Getting environment variable errors?**
- Make sure all 3 variables are set in Edge Functions Settings
- Check for typos in variable names
- Restart/refresh after setting variables

