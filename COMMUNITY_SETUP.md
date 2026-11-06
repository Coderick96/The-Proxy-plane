For version 2.2, also run supabase/premium.sql after community.sql. See PREMIUM_SETUP.md for server credentials, paid access and AI.

# Connect the Kingdom

The new Home screen and device vault work locally. Shared Cardsmith profiles,
following and community posts need one Supabase project used by everyone.
This ZIP contains the implementation and migrations; it does not provision or
connect an online project automatically.

## 1. Prepare the database

Use your existing Supabase project, or create one. In its SQL Editor, run:

1. `supabase/schema.sql` (base project storage and the private artwork bucket).
2. `supabase/community.sql` (Cardsmith profiles, collections, following,
   rendered posts and their access policies).

The community migration is repeatable. Existing projects receive the private
visibility default. It does not publish existing work. Leave both artwork
buckets private; do not turn them into public buckets in the dashboard.

## 2. Connect this app

Copy `.env.example` to `.env` in the same folder as package.json. Set:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

Use the project's public anon key, never a service-role or secret key. The
browser uses the signed-in user's session and database row-level policies.

Configure the Supabase Authentication Site URL to match the URL you use,
for example `http://127.0.0.1:5173`. Add `http://localhost:5173` to permitted
redirect URLs if you also use that address. Add your real site URL when hosted.
Google/Apple sign-in require their own provider configuration; email/password
works with the project's email confirmation settings.

Stop the app, then reopen START_THE_PROXY_PLANE.bat so it reloads .env.

## Separate local workspaces

Signed-in Cardsmiths now have separate local vaults, drafts, print queues and
collections. Signing out returns to the device-only guest workspace. Your old
1.x device work stays in that guest workspace; it is not silently uploaded or
made public. After signing in, My Vault → Copy device-only work makes private
copies in that account, with new card IDs. Existing copies are not duplicated.
This does not move or delete the guest originals. Backups are another explicit
way to transfer work. Browser storage is device-local, not encrypted storage.

## 3. Become a Cardsmith

1. Open Account / Sync, create an account and verify your email if required.
2. Open Kingdom Collection → My profile.
3. Choose a unique Cardsmith username, display name, emblem and bio.
4. Choose public or private profile visibility, then Save Cardsmith profile.

No email address is included in public profiles.

## 4. Organize and share

Save a card in the workshop, then open My Vault. New cards and new collections
are private. Create a collection and move cards into it with the Collection menu.
Each saved card also has its own visibility setting.

To publish, use Share → choose Rendered proxy card or Artwork only → add a
caption → Publish to Kingdom Collection. The profile and assigned collection
must be public. Publishing makes the individual card public and stores a
rendered PNG snapshot, credited to the Cardsmith and the card's artist field.
A public setting without a published snapshot does not create a new post.
Republish after design changes to update the shared snapshot.

Other people see a post only when all of these allow it:

- the Cardsmith profile is public;
- the individual card is public;
- its collection is public, if the card belongs to a collection.

Making any of them private blocks subsequent public reads. Following does not
grant access to private work. Already downloaded/shared copies cannot be
recalled. Public posts never expose the editable project JSON or private source
artwork. The community bucket stays private and checks access at download time.

Published cards require the owning account to change their privacy. Removing a
card from the device vault first makes its account copy private; it does not
permanently delete that account copy. Local-only cards can be removed locally.

## 5. Discover Cardsmiths

Explore shows public posts. Cardsmiths searches public usernames and opens their
profiles and public collections. Follow Cardsmith adds that creator's public
posts to Following. Use Refresh to load new posts and updated privacy settings.
Private profiles cannot be followed by other people. This version does not
implement follow requests, notifications, likes, comments or editable remixes.

## Localhost versus a shared site

A localhost address only opens on that computer. People running the app on
separate computers can connect to the same Supabase project, but sharing a
single website link requires hosting the frontend and configuring its Auth
redirect URL. No hosting deployment was performed for this ZIP.

Use the same browser and exact localhost/127.0.0.1 address for existing device
saves. Those addresses have separate browser storage. Back up your vault before
switching. Account sync is explicit; local changes are not continuously synced.

## Verification

Run `npm run test:community` after npm install. It runs an embedded PostgreSQL
policy test and simulated React DOM interactions. Tests cover private defaults,
owner isolation, profile/collection/card visibility, storage reads, following,
foreign-key ownership, publish failure behavior and basic UI flows. The test
database runs in memory and does not contact your Supabase project.

Build with `npm run build`. Live multi-user Auth, real Supabase Storage and
browser-rendered publication still require testing against your configured
project. Backend credentials are not included.
