# BridgeMUN — Setup

Everything is built. Two things have to happen before it runs: connect a
Firebase project, and open the site through a local address rather than
by double-clicking the file.

---

## Part 1 — Create the Firebase project (about 10 minutes)

### 1. Make the project

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Add project**, name it `bridgemun`, and continue.
3. Google Analytics is not needed — turn it off.

### 2. Turn on email login

1. In the left menu: **Build → Authentication → Get started**.
2. Choose **Email/Password**, switch **Enable** on, and save.

### 3. Turn on the database

1. In the left menu: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (the rules in Part 2 below will open it correctly).
3. Pick a location near you — `asia-northeast3` is Seoul.

### 4. Get your settings and paste them in

1. Click the **gear icon → Project settings**.
2. Scroll to **Your apps**, click the **web icon `</>`**.
3. Nickname it `bridgemun-web` and register. Skip Firebase Hosting for now.
4. Firebase shows a block of code containing `firebaseConfig`. Copy the seven values.
5. Open **`firebase-config.js`** and replace every `PASTE_...` placeholder with your values.

That's the only file you edit.

---

## Part 2 — Security rules

By default Firestore lets nobody in. Paste these rules so logged-in
delegates can take part, but strangers cannot.

In the console: **Firestore Database → Rules**, replace everything, **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Delegate profiles: any logged-in delegate can see the roster,
    // but you can only create or change your own profile.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }

    // Board posts: everyone logged in reads the board, and anyone
    // logged in may publish a post. A delegate may delete their own
    // post, but nothing can be edited after it is published — the
    // record of what was said should stand.
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if false;
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
  }
}
```

---

## Part 3 — Running the site

**Double-clicking a page will not work.** Two features refuse to run that
way: the shared JavaScript files, and the microphone. Both need a real
web address.

Open Terminal, go to the project folder, and run:

```
cd "/Users/allison/Project MUN"
python3 -m http.server 8000
```

Then open **<http://localhost:8000/login.html>** in **Google Chrome**.

To stop the server, press `Control + C` in Terminal.

---

## Part 4 — Try it

1. **Sign up** — name, delegation, email, password. You land on the board.
2. **Write** in the top bar — type a title and body, or **press Record**,
   allow the microphone when Chrome asks, and speak. Your words appear in
   the box. Press **Stop**, edit if needed, then publish.
3. **Generate AI Opening Speech** on the board — the United States
   publishes its speech as a post.
4. Click any post on the board to see it in full.
5. Open a second browser window in **incognito**, sign up as a different
   country, and watch posts appear live in both.

---

## Notes and limits

- **Chrome only, for voice.** Speech recognition is built into Chrome and
  Edge. Safari and Firefox will show a message and let you type instead.
- **The speech recognition is free** and runs through the browser — no API
  key, no cost, nothing to install.
- **The recording is not saved.** Only the recognised text is stored. If
  you want the audio kept too, that needs Firebase Storage — a later step.
- **The AI delegate is still not real AI.** Its speech is written in
  advance in `committee.js`, clearly marked. Connecting a real AI service
  means replacing that one value.
- **Your Firebase settings are not secrets.** They are meant to be visible
  in the browser. The security rules in Part 2 are what protect the data.

---

## The files

| File | What it is |
|---|---|
| `signup.html` / `signup.js` | Creating a delegate account |
| `login.html` / `login.js` | Logging back in |
| `board.html` / `board.js` | The board: roster and every post, newest first |
| `write.html` / `write.js` | Writing a new post, by typing or by voice |
| `post.html` / `post.js` | One post's full page |
| `style.css` | How the whole platform looks |
| `firebase-config.js` | **The one file you edit.** Your Firebase settings |
| `countries.js` | The list of delegations. Edit to change the committee |
| `speech.js` | Speech-to-text, shared by the write page |
| `session.js` | Who is logged in, and logging out |
| `CLAUDE.md` | Working rules for this project |
