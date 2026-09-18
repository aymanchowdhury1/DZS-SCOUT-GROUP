# Free Realtime Database setup (no Firebase Storage, no plan upgrade)

This version intentionally does **not use Firebase Storage**. You do not need to upgrade the Firebase billing plan for this site design.

## 1. Firebase services to enable

Enable only:

- Authentication → Email/Password
- Realtime Database

Do **not** enable or configure Cloud Storage for this version.

## 2. Firebase web configuration

Put your Firebase web configuration in `firebase-config.js`. This version only needs the Firebase Auth and Realtime Database fields.

The administrator email used by the rules is:
`aymanc366@gmail.com`

Change that email in both `firebase-config.js` (`ADMIN_EMAIL`) and `database.rules.json` if you use a different admin.

## 3. Realtime Database rules

Firebase Console → Realtime Database → Rules → replace the rules with the contents of `database.rules.json` in this ZIP → Publish.

The rules allow:

- Public reading of the normal site posts.
- A signed-in user to read/write their own `/users/$uid` profile.
- The verified administrator to read all `/users`, `/biometric`, and `/attendance` data.
- The verified administrator to set/change device WebAuthn credentials.
- The verified administrator to record attendance.
- Public shop reading and administrator-only shop editing.

## 4. Signup fields

New accounts store:

- Full name
- Email
- Username
- Mobile number
- Class
- Roll number
- Member type
- Profile picture URL/data
- Created/updated timestamps

## 5. Profile picture

A logged-in member can click their username/profile icon. They can change their full name, username, mobile, class, roll, member type, and profile picture.

Profile pictures can be supplied as an HTTP/HTTPS image URL or uploaded from the device. Uploaded images are resized/compressed in the browser and saved as a small data URL in Realtime Database. This avoids Firebase Storage but means very large photos should not be used.

## 6. Attendance

Attendance is an administrator-only tab. It shows profile picture, name, username, email, mobile number, class, roll, member type, fingerprint setup state, today's attendance, and last attendance date.

Fingerprint registration uses the browser's WebAuthn platform authenticator. The actual biometric check is handled by the device/OS (for example Windows Hello or an Android platform authenticator). The website does not store a fingerprint image.

The credential ID is stored in `/biometric/$uid`. Changing fingerprint overwrites that user's registered credential ID, so only the current registered credential is accepted by this site.

Attendance records are stored under `/attendance/$uid/YYYY-MM-DD`.

The PDF button generates the current Dhaka month/year and includes each day from the first through the current day. `P` means a saved attendance record; `-` means there is no attendance record for that date. A PDF is generated automatically after a successful attendance action.

## 7. Shop

The Shop uses only Realtime Database. Product images are URL-based in this free version. No file upload or Firebase Storage is used.

## 8. Important browser requirement for fingerprint

WebAuthn generally requires a secure context. Use HTTPS on your hosted website or `localhost` during local development. The feature will not work on an insecure plain HTTP origin.

### Existing accounts created before the profile fields were added

The site automatically creates a missing `/users/<uid>` profile record when a signed-in account is found without one. This lets older accounts (including the admin account) appear in the Attendance tab. The admin can then open Profile and fill in mobile number, class, roll, member type, and profile picture.


## Member types and fingerprint attendance

Member type is stored as an array containing 1 to 3 values from: `P.S`, `C.D`, `S.P.L`, `P.L`, `A.P.L`, `MEMBER`. Existing older values are no longer accepted by the UI.

The administrator opens Attendance and uses `Fingerprint Setup` beside each member once. The top `Attendance` button then starts a userless biometric check. Anyone with a registered device credential can use the same screen; the returned WebAuthn credential ID is matched in Realtime Database to identify the member, so the administrator does not select a person manually. Only a successful matching credential is written as present for that date.

For this flow, fingerprint setup uses a discoverable platform WebAuthn credential (`residentKey: required`). The browser/OS may display Windows Hello, Android biometric authentication, or another platform user-verification prompt. No fingerprint image is stored.
