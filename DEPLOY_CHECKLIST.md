# ✅ Vercel Deployment Checklist

## Critical Files Ready for Deploy

✅ **API Endpoints Created:**
- `/app/api/specialists/application/route.ts`
- `/app/api/specialists/verify-email/route.ts`
- `/app/api/admin/specialists/pending/route.ts`
- `/app/api/admin/specialists/update/route.ts`

✅ **Server Infrastructure:**
- `/lib/supabase/server.ts` (637 bytes)

✅ **Configuration:**
- `vercel.json` ✓
- `VERCEL_DEPLOY.md` ✓
- `deploy.sh` ✓

✅ **Updated Files:**
- `app/admin/page.tsx` - uses API for approvals
- `app/become-specialist/page.tsx` - uses API + enhanced UI

---

## Quick Deploy (Option 1: Automated)

```bash
./deploy.sh
```

Then add env vars in Vercel Dashboard.

---

## Manual Deploy (Option 2)

### Step 1: Commit & Push

```bash
git add .
git commit -m "feat: server-side specialist registration with admin approval"
git push origin main
```

### Step 2: Vercel Environment Variables

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these **4 variables** (all environments: Production, Preview, Development):

| Variable Name | Value | Type |
|---------------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xbvyvvbionpcyasrbuey.supabase.co` | Plain Text |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (from .env.local) | Plain Text |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (from .env.local) | **🔒 Encrypted** |
| `ADMIN_API_TOKEN` | `some-long-random-secret` | **🔒 Encrypted** |

⚠️ **IMPORTANT:** Mark `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_API_TOKEN` as **Encrypted** (sensitive)

### Step 3: Redeploy

After adding env vars, trigger redeploy:
- Click "Redeploy" button in Vercel dashboard, OR
- Push a new commit

---

## Post-Deploy Testing

### 1. Test Specialist Registration API

```bash
curl -X POST https://your-domain.vercel.app/api/specialists/application \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prodtest@example.com",
    "name": "Production Test",
    "phone": "+49123456789",
    "category_id": "psychologists",
    "proof_link": "https://example.com/proof.pdf",
    "terms_accepted": true
  }'
```

**Expected Response:**
```json
{
  "success": true
}
```

### 2. Test Frontend Form

Visit: `https://your-domain.vercel.app/become-specialist`

Fill and submit form → should see green success message with moderation details.

### 3. Test Admin Panel

Visit: `https://your-domain.vercel.app/admin`

Login with token → should see pending specialists → approve/reject should work.

---

## Troubleshooting

### ❌ 500 Error on `/api/specialists/application`

**Check Vercel Function Logs:**
```bash
vercel logs your-deployment-url.vercel.app
```

**Common causes:**
- `SUPABASE_SERVICE_ROLE_KEY` not set
- Environment variable typo
- Module not found (ensure `lib/supabase/server.ts` is committed)

**Fix:**
1. Verify all 4 env vars are set in Vercel
2. Check they're assigned to all environments
3. Redeploy

### ❌ "Module not found: @/lib/supabase/server"

**Fix:**
```bash
git add lib/supabase/server.ts
git commit -m "add server supabase client"
git push
```

### ❌ RLS errors still appearing

**Fix:**
- Service role key should bypass RLS automatically
- Double-check the key is correct (not anon key)
- Verify key is marked as "Encrypted" in Vercel

---

## Architecture Verification

After deploy, verify these endpoints are live:

1. ✅ `POST /api/specialists/application` → 200 (success) or 400/500 (error)
2. ✅ `GET /api/specialists/verify-email?token=...` → подтверждает email
3. ✅ `GET /api/admin/specialists/pending` → список заявок модерации
4. ✅ `POST /api/admin/specialists/update` → approve/reject работает
5. ✅ Frontend form at `/become-specialist` → submits to application API

---

## Security Checklist

- ✅ Service role key NEVER exposed client-side (no `NEXT_PUBLIC_` prefix)
- ✅ All INSERT operations server-only via API
- ✅ RLS policies block direct client inserts
- ✅ Public client used only for SELECT (approved specialists)
- ✅ Admin actions require `ADMIN_API_TOKEN` via `x-admin-token`

---

## Monitoring

**View real-time logs:**
```bash
vercel logs --follow
```

**Check build output:**
```bash
vercel inspect [deployment-url]
```

---

## Success Indicators

✅ Form submits successfully
✅ Success message appears with moderation details
✅ Specialist appears in admin panel with "pending" status
✅ Admin can approve/reject
✅ Approved specialists visible in category pages
✅ No RLS errors in logs
✅ No "module not found" errors

---

**Ready to deploy!** 🚀
