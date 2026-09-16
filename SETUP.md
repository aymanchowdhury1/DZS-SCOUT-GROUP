# Connecting this site to Firebase (free tier)

Until you do this, the site runs in **read-only preview mode**: you'll see a red
banner at the bottom, login/sign-up are disabled, and the sample posts are
just hard-coded placeholders that reset on every page load.

Everything below is free on Firebase's "Spark" plan for a site this size —
Realtime Database, Authentication and Storage all have a permanent free tier,
no credit card required.

## 1. Create the project

1. Go to https://console.firebase.google.com → **Add project** → give it a name
   → you can skip Google Analytics.
2. Once it's created: **Project settings** (gear icon) → **General** →
   scroll to "Your apps" → click the **Web** icon (`</>`) → register the app
   (nickname doesn't matter, skip Hosting).
3. Firebase shows you a `firebaseConfig` object — copy those values into
   **`firebase-config.js`** in this folder, replacing the `YOUR_...` placeholders.
   It won't have a `databaseURL` yet — you'll get that in step 2 below and
   need to add it in by hand (or re-open "Your apps" afterwards to re-copy it).

## 2. Turn on the three services

In the left sidebar, under **Build**:

- **Authentication** → Get started → *Sign-in method* tab → enable
  **Email/Password**.
- **Realtime Database** → Create database → pick any region close to
  Bangladesh (e.g. Singapore) → start in **locked mode**. Once created, copy
  the URL shown at the top of the page (looks like
  `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app`)
  into `databaseURL` in `firebase-config.js`.
- **Storage** → Get started → production mode → same region.

## 3. Set the security rules

"Locked mode" blocks everyone by default — you need rules that let visitors
*read* posts, but only your admin account *write* them.

### Realtime Database rules
Realtime Database → **Rules** tab → replace everything with:

```json
{
  "rules": {
    "posts": {
      ".read": true,
      "$section": {
        "$postId": {
          ".write": "auth != null && auth.token.email == 'aymanc366@gmail.com' && auth.token.email_verified == true"
        }
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### Storage rules
Storage → **Rules** tab → replace everything with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == "aymanc366@gmail.com"
                   && request.auth.token.email_verified == true
                   && request.resource.size < 50 * 1024 * 1024;
    }
  }
}
```

Change `aymanc366@gmail.com` in **both** rule sets, and in
`firebase-config.js` (`ADMIN_EMAIL`), if you want a different admin address.
All three must match exactly.

## 4. Create the admin account

There's no admin password baked into the code — you create the account like
any other:

1. Open the live site → **Sign up** → register using the exact email you put
   in the rules above (e.g. `aymanc366@gmail.com`) and a strong password.
2. Check that inbox and click the verification link Firebase sends.
3. Log in. Because your email matches `ADMIN_EMAIL`, you'll now see
   **+ New Post**, **Edit**, **Delete**, and drag handles on every post —
   nobody else will, even if they sign up.

## 5. Notes on uploads

- Images/PDFs/videos you upload go to Firebase **Storage** and are served
  from Google's CDN — visitors everywhere see the same content, unlike the
  old prototype which only saved things in your own browser.
- PDFs render inline in an embedded viewer (with an "Open in new tab" link
  underneath); videos accept a YouTube/Vimeo link (auto-embedded as a player)
  or a direct file upload/.mp4 link (rendered with a native `<video>` player).
- Free-tier limits: Realtime Database — 1GB stored, 10GB/month downloaded.
  Storage — 5GB stored, 1GB/day downloaded. Comfortably enough for a troop
  site; keep an eye on the Firebase console if you start posting a lot of video.
