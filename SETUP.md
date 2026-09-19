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
- The verified administrator to read all `/users` and `/attendance` data.
- The verified administrator to record attendance manually for each member.
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

Attendance is an administrator-only tab. It shows profile picture, name, username, email, mobile number, class, roll, member type, today's attendance, and last attendance date.

Each member has a manual `Attendance` button. Clicking it marks that member present for the current Dhaka date. A member already marked present for that date cannot be marked again. No fingerprint or device biometric is required.

Attendance records are stored under `/attendance/$uid/YYYY-MM-DD`.

The `Generate PDF` control has two modes: `Month` generates the current Dhaka month schedule; `Year` generates a full-year PDF containing 12 monthly attendance tables for the selected year (defaulting to the current year). The PDF is generated only when the administrator clicks `Generate PDF`; attendance marking does not download a PDF automatically. `P` means present, `-` means no attendance record, and future dates in the current month are left blank in the monthly report.

## 7. Shop

The Shop uses only Realtime Database. Product images are URL-based in this free version. No file upload or Firebase Storage is used.

## 8. Existing accounts created before the profile fields were added

The site automatically creates a missing `/users/<uid>` profile record when a signed-in account is found without one. This lets older accounts (including the admin account) appear in the Attendance tab. The admin can then open Profile and fill in mobile number, class, roll, member type, and profile picture.


## Member types

Member type is stored as an array containing 1 to 3 values from: `P.S`, `C.D`, `S.P.L`, `P.L`, `A.P.L`, `MEMBER`. Existing older values are no longer accepted by the UI.
