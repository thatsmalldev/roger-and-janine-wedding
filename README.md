# Roger & Janine — Free static wedding website + Supabase RSVP

This package contains the full wedding website, copy, database schema, browser JavaScript, and setup instructions. No Node server, payment service, Supabase Edge Function, or paid domain is required. You still need to create your own GitHub and Supabase projects and supply their public configuration.

## 1. Confirm the date and planning details

Your wedding is Saturday, February 6, 2027 at 3:00 PM, with guest arrival at 2:00 PM and the celebration ending at 7:00 PM. All times use **Asia/Manila (UTC+8)**. Both ceremony and reception are at Kabaleyan Cove Resort, San Carlos City, Pangasinan. No exact reception start time was supplied; the page says “After the ceremony.”

The supplied RSVP deadline, **December 19, 2027**, is after the wedding. **December 19, 2026 is only a proposed correction.** The database initially closes submissions by storing a NULL deadline. It also rejects any deadline after the wedding. Confirm the actual date before opening RSVPs.

Review COPY.md and index.html. The love story is a reflective draft without invented meeting details. Confirm children arrangements and venue parking, then replace the corresponding FAQ answers. Add your preferred contact details if you want a direct contact link; none were invented. The default copy refers guests to the contact channel used for their invitation.

A main guest declining automatically marks all their companion places as declined. A companion attending without the main guest must contact you. This proposed rule is enforced in app.js and admin/schema.sql; update both if you want a different policy. All companion places are flexible plus-one slots, not locked to predetermined people. If children are included, count them in the invitation allowance and explain privately which people are invited. This code does not track children's ages or meals.

## 2. Files and publishing boundary

| File | Purpose | Publish to GitHub Pages? |
| --- | --- | --- |
| index.html | Complete site and accessible RSVP layout | Yes |
| styles.css | Responsive black and gold design | Yes |
| config.js | Your public Supabase URL and publishable key | Yes |
| app.js | Name/code lookup, form generation, submission | Yes |
| .nojekyll | Serve the site as plain static files | Yes |
| COPY.md | Editable standalone wedding copy | Optional; not needed for site |
| admin/schema.sql | Tables, restricted database functions and grants | No; run privately in SQL Editor |
| admin/add-guest.sql | Private guest/code provisioning example | No |
| tests/database.sql | Transactional database verification | No; run privately in SQL Editor |
| tests/browser.cjs | Browser tests using mock RPCs | No |
| tests/logic.cjs | Dependency-free application logic checks | No |

**Upload only the five website files**, not the whole ZIP. Never put your master guest list, generated invitation codes, database password, SQL Editor output, secret key, or service_role key in the public repository. Git history can retain deleted data. The publishable key is deliberately public; security comes from database privileges and code verification.

## 3. Create the Supabase Free project

1. Sign in at https://supabase.com and create a project in a Free organization. Choose a strong database password and keep it private.
2. Open the project's **SQL Editor**, choose a new query, and paste **admin/schema.sql** in full. Run it once in a **fresh project**. It runs inside a transaction; do not rerun over existing objects or delete existing tables to fix an error.
3. The schema creates public.guests, turns on Row Level Security (RLS), revokes anonymous/authenticated table access, and creates two narrowly scoped functions. wedding_private stores the cutoff and normalization helper; do not add this schema to Data API exposed schemas.
4. Leave the **public** schema exposed to the Data API so the two public RPC functions can be called. No public SELECT/UPDATE policies should be added to guests.
5. In the project's **Connect** dialog or **Settings → API Keys / Data API** (labels can change), copy the project URL and **publishable key**. A legacy public anon key also works. **Never use a secret or service_role key in frontend code.**
6. Replace the two placeholders in config.js:

```javascript
window.WEDDING_CONFIG = Object.freeze({
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabasePublishableKey: 'sb_publishable_your_actual_public_key'
});
```

This project does not use Supabase Auth, so no sign-in redirect or email configuration is required. The browser runs as the `anon` database role. The client disables persisted auth sessions.

## 4. Add the master guest list and send codes privately

One row represents a main guest and their allowed additional places. The main guest does **not** count toward max_plus_ones. max_plus_ones=0 means only that main guest may respond; 2 means main guest plus two additional people. The cap is 10 in this starter; change both the SQL cap and JS cap checks together if necessary.

1. Open admin/add-guest.sql. Change `Maria`, `Santos`, `1`, `false`, `false` to the guest's first name, last name, companion allowance, sponsor flag, and entourage flag.
2. Run the first statement in SQL Editor. It generates a random 32-character UUID-derived code and stores its SHA-256 hash. Copy the returned code **immediately** into your private invitation records. The database cannot recover the raw code later.
3. Send the name, site link, and code privately using your chosen invitation channel. Example: “Please RSVP using the name Maria Santos and your private invitation code: [generated code].” The code must not go in the public website, a public QR link, analytics, query strings, or screenshots you share publicly.
4. Repeat for each invitation. Principal sponsors use `is_principal_sponsor=true`; entourage members use `is_entourage=true`. Both can be true. These flags are returned as read-only information and cannot be changed through the RSVP API.
5. Duplicate names are supported: different invitations have different random codes. Names are matched case-insensitively with trimmed/collapsed spaces and Unicode NFC normalization. Accents and punctuation are preserved, so `Peña` and `Pena` are different spellings.

If a code is lost or shared with the wrong person, use the commented rotation query in admin/add-guest.sql. Replace the UUID first, then run only that query and copy the new code. Old codes stop working.

### Bulk provisioning

For a larger list, import names, caps and roles into a **private staging table** through Supabase's dashboard CSV import. Generate one random code per staged row in a single SQL provisioning statement and store only hashes in public.guests. Save the returned codes privately before closing the result. Do not import a public CSV or expose the staging table. This package includes the complete per-invitation SQL route so no bulk-import dependency is required.

## 5. Open RSVPs after confirming the deadline

The functions read the deadline from one private row, so browser clock changes cannot bypass it. A deadline is exclusive: a cutoff of December 20 at midnight means guests can respond throughout December 19.

**Only if you confirm December 19, 2026**, run:

```sql
update wedding_private.settings
set rsvp_deadline = '2026-12-20 00:00:00+08'
where singleton;
```

If the date is different, use midnight immediately after the confirmed RSVP day, including `+08`. Update the “When should I respond?” FAQ in index.html and COPY.md to match. The form displays the authoritative database cutoff after a successful lookup. Until configured, it explains that RSVPs are not yet open and does not show a response form.

To close immediately:

```sql
update wedding_private.settings set rsvp_deadline = null where singleton;
```

## 6. Publish for free on GitHub Pages

1. Sign in at https://github.com. Create a **public** repository, for example `roger-janine-wedding`. Public repositories support GitHub Pages on GitHub Free.
2. Upload only index.html, styles.css, config.js, app.js and .nojekyll to the root of the `main` branch. .nojekyll is an empty file; create it locally if your file picker hides it.
3. Open **Settings → Pages → Build and deployment**. Under Source choose **Deploy from a branch**, then select `main` and `/ (root)`, and Save.
4. Wait for the Pages deployment to finish. Open the URL GitHub shows, typically `https://YOUR_USERNAME.github.io/roger-janine-wedding/`.
5. Use HTTPS and turn on **Enforce HTTPS** if offered. Relative asset paths in this starter work at the repository subpath.
6. On a phone and desktop, check the page, invite lookup, attendance form and saved confirmation. You must verify that responses appear in Supabase before sending invitations.

No build command or GitHub Actions customization is needed. For a public first look before Supabase is configured, the wedding content still displays; the RSVP form shows an unavailable message.

## 7. How this is secure within a static architecture

A name is not a password. A name-only `.from('guests').select()` plus anonymous `.update()` policy would let strangers enumerate invitations or alter responses. This implementation deliberately uses **client-side Supabase CDN calls to database RPCs**, rather than granting the browser direct row access. No application server is required. The lookup RPC queries guests internally and submit_rsvp updates that exact database entry.

- A guest needs the exact name plus a high-entropy private invitation code for **every** lookup and update. Code hashes are checked inside Postgres and are not returned.
- public.guests has RLS enabled, zero public policies and no anonymous/authenticated table grants. Unfiltered table reads/writes fail. Adding a permissive policy is unnecessary and unsafe.
- Only lookup_invitation and submit_rsvp are executable by anon. Other function execution grants are explicitly revoked. These two SECURITY DEFINER functions intentionally run with their creator's privileges, use an empty search_path, and fully qualify table/helper names. Their code must remain carefully scoped.
- The browser never supplies an authoritative guest UUID, cap or role. The database finds the row by name/code, locks it, checks the current cap, validates each companion, rejects invalid statuses and checks the deadline.
- Exactly max_plus_ones slots must be submitted. An unused slot is explicitly declined with blank names allowed. Names are mandatory for attending companions. The database rebuilds each JSON object from allowed fields, discarding extra fields.
- Only RSVP status, companion responses, revision and responded_at are updated. Master names, role flags and allowance cannot be edited by public callers.
- Optimistic revisions reject stale tabs. If two devices submit the same revision, only one save succeeds; the other must look up the latest response. An uncertain network result requires another lookup to see whether the save committed.
- Names are normalized, trimmed and length-checked without destroying legitimate punctuation. Controls are rejected. Structured RPC parameters prevent SQL injection; no SQL strings are concatenated. Dynamic content uses textContent and .value, not innerHTML, so names cannot become executable HTML.
- Codes remain only in active page memory after lookup, not localStorage, cookies, URLs or logs. “Finish / use another invitation” clears the active form and code state.

**Limits:** A code is a bearer credential: anyone who obtains it and the guest's name can respond. It is not proof of personal identity. This starter has no per-IP rate limiting or CAPTCHA challenge verification; determined public callers could consume free-tier API resources. Do not confuse browser throttling, hiding the publishable key, a robots directive, or origin restrictions with authorization. If you need abuse protection against deliberate traffic, add a trusted gateway/Edge Function with verified challenges and rate limiting; that extends this static-plus-database design. Supabase Auth is an alternative if you prefer guest sign-in. The included functions should receive the database tests and a real-project review before launch.

The website is public (including the event location); only the guest list and responses are restricted. The noindex meta tag discourages indexing but does not restrict access. Use a trusted computer for administration, export response backups privately, and remove personal data when no longer needed for wedding planning. No analytics or third-party fonts are included.

## 8. Verify before inviting guests

### Database verification

After schema.sql, run **tests/database.sql** in SQL Editor as the project administrator. It provisions a temporary fixture inside a transaction, checks anonymous table denial, correct and incorrect name/code combinations, saves, limits, malformed data, roles, stale revisions, and cutoff enforcement, then **ROLLBACK** removes fixture data and restores the original deadline. Never run it partially or remove the transaction wrapper.

These SQL tests are supplied for your Supabase instance. They have **not been executed against a live Supabase database in this delivery environment**.

### Application logic verification

Run `node tests/logic.cjs` from the package folder. These dependency-free tests execute the actual app.js against a minimal mocked DOM and mocked Supabase RPCs. They passed in the delivery environment for lookup failures, closed forms, network failures, control characters, Unicode normalization, guest display, roles, 0/1/2 companion slots, required names, saves, declines, revision conflicts and reset. JavaScript syntax checks also passed. This is not proof of database security or browser layout.

### Browser verification

The browser test could not run in the delivery environment because a Chromium executable was unavailable. Mobile/desktop rendering and real-browser interactions remain to be verified in your setup.

The development test is tests/browser.cjs. It requires Node.js and Playwright (development only); the live website has no Node dependency. Install Playwright locally and its Chromium browser, then run:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

It uses mock Supabase RPCs rather than live credentials. Do not publish node_modules, package files, tests or your private database records.

### Live acceptance checklist

1. Wrong name or wrong code: the exact name-not-found message appears and no response form opens.
2. max_plus_ones=0: no companion controls appear. max_plus_ones=2: exactly two companion sections appear.
3. Save an attending response, then look it up again to confirm names and statuses persisted. Save a decline and check the database.
4. A principal sponsor/entourage row displays the correct read-only role. Attempting to inject role fields into an RPC must not change the stored flags.
5. A forged extra companion payload fails in SQL. A direct browser `client.from('guests').select('*')` or `.update(...)` is denied by table privileges/RLS. Do not add policies to “fix” this denial.
6. Open one invitation in two tabs; save one, then attempt to save the stale other tab. It must ask for another lookup.
7. Temporarily close RSVP by setting the deadline to NULL; both existing forms and new lookups must be unable to save. Restore the confirmed cutoff afterward.
8. Test a phone, keyboard navigation, apostrophes, hyphens, accented names, a slow/disconnected connection and a browser with a blocked CDN.

## 9. View responses privately

Use **Table Editor → guests** in the Supabase dashboard. Only you/authorized project administrators should access it. To calculate confirmed people, run privately:

```sql
select
  count(*) filter (where rsvp_status='attending') as main_guests_attending,
  coalesce(sum((select count(*) from jsonb_array_elements(g.plus_ones) p
    where p->>'status'='attending')),0) as companions_attending,
  count(*) filter (where rsvp_status='declining') as main_guests_declining,
  count(*) filter (where rsvp_status='pending') as main_guests_pending
from public.guests g;
```

Export responses privately from the dashboard as needed. Pending, declined and unused slots must not count as attending. If you reduce max_plus_ones after an RSVP, reconcile plus_ones as an administrator first: the database constraint prevents lowering the allowance below the stored array length. Increase revision whenever an administrator changes response data or invitation allowances so an already-open form cannot overwrite that change unnoticed.

## 10. Free-tier operation and references

As checked November 2, 2026, GitHub Pages supports free hosting from public GitHub Free repositories. Supabase Free includes a 500 MB database and may pause projects after a week of inactivity/low activity. This should fit a typical wedding guest list within current quotas, but it is not a promise of uninterrupted availability or permanently unchanged pricing. Monitor usage and project-pausing notices. Check the project is active before sending invitations and resume it through the dashboard if necessary. Keep a direct contact option for guests who cannot use the form.

Official sources:

- https://docs.github.com/en/pages/quickstart
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/reference/javascript/installing
- https://supabase.com/docs/reference/javascript/rpc
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys

The CDN script uses Supabase JS major version 2. After live testing, consider pinning a specific tested patch version in index.html so a future library update does not unexpectedly change your site. A blocked CDN/network or paused database will prevent online responses; the page gives a contact fallback instead of claiming a save succeeded.
