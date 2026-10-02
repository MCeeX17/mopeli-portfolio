# My Portfolio

Personal portfolio hosted on GitHub Pages. Projects are stored in Firebase Firestore and only the owner can edit them.

## Files

- `index.html` - page markup
- `style.css` - theme
- `app.js` - Firebase auth, Firestore, rendering
- `login-bg.jpg` - login screen background
- `firestore.rules` - paste into Firebase Console > Firestore > Rules (replace the UID first)
- `cv.pdf` - **add your CV here** (the "View my CV" button links to it)

## Setup

1. Create a Firebase project, enable **Authentication > Email/Password** and **Firestore**.
2. Create your admin user in Firebase Authentication and copy its UID.
3. Firebase config for `mopeli-portfolio` is already in `app.js`.
4. In **Firestore > Rules**, use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "YOUR_EXACT_UID";
    }
  }
}
```

5. In Firebase **Authentication > Settings > Authorized domains**, add `YOUR_USERNAME.github.io`.
6. Push to GitHub, then **Settings > Pages > Deploy from branch > main / root**.

## Admin login

Click the **M** next to the name 5 times quickly (works on desktop and phone). Ctrl+Shift+L also works on desktop.
