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
    // logged in may publish a post. A delegate may edit or delete their
    // own post (an edit may not change who the post belongs to).
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.uid
                    && request.resource.data.uid == resource.data.uid;
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }

    // Which empty seats have the AI delegate switched on: everyone logged
    // in can see it and flip it. One document per country.
    match /seats/{country} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.resource.data.ai is bool;
      allow delete: if false;
    }

    // Live meetings: a delegate starts one, others join it, and the Chair
    // updates what everyone sees (time left, who is speaking, the open
    // vote). Everyone logged in can read and update a meeting; only a
    // delegate can create one, and only as themselves. Nobody can delete one.
    match /meetings/{meetingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.hostUid == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if false;

      // One ballot per delegation per vote. It can be created once, only
      // by the delegate it says it is from, and never changed or deleted.
      match /ballots/{ballotId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
        allow update, delete: if false;
      }
    }

    // Saved meeting logs from the debate simulator: everyone logged in
    // can read past logs, and anyone logged in can save one when their
    // debate ends. Nobody can change or remove a saved log afterward.
    match /debateLogs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

> **If you already pasted rules before:** the `meetings` block (and, from
> earlier, `seats` and the new `posts` rule for editing) are new. Re-paste
> the whole block above into **Firestore Database → Rules** and **Publish**
> again. Until you do, a meeting still runs on the Chair's screen (with AI
> delegates voting), but other students cannot join it and no one else can
> vote; the screen says "not shared" when this is the case.

---

## Part 3 — Running the site

**Double-clicking a page will not work.** Two features refuse to run that
way: the shared JavaScript files, and the microphone. Both need a real
web address.

Open Terminal, go to the project folder, and run:

```
cd "/Users/allison/Project MUN"
python3 serve.py
```

Then open **<http://localhost:8123/login.html>** in **Google Chrome**.
(`serve.py` is the same as `python3 -m http.server`, except it tells the
browser never to keep old copies of the files, so an edit always shows up
on a normal refresh.)

To stop the server, press `Control + C` in Terminal.

---

## Part 4 — Try it

1. **Sign up** — name, delegation, email, password. You land on the **start
   page**.
2. **Start Meeting.** The screen becomes the meeting room. Pick who takes
   part, tick **Silent mode** if you have no ElevenLabs key, and press
   **Start Meeting** — the same screen turns into the live debate.
3. **Call a vote.** AI delegates vote by themselves, with a reason; you
   only ever vote for your own country.
4. **Two people.** Open a second browser window in **incognito**, sign up as
   another country (say, Republic of Korea), and open the start page: your
   running meeting is listed with a **Join** button. Join it, then call a
   vote from the first window — the second window gets its own Yes/No buttons
   for its own country.
5. **Wrap up** with a resolution vote. The result is saved and shows up under
   "Recent Results" on the start page.
6. **Write** in the top bar — type a title and body, or **press Record**
   and speak. Posts appear in the **Discussion Feed** on the meeting screen.

---

## Notes and limits

- **Chrome only, for voice.** Speech recognition is built into Chrome and
  Edge. Safari and Firefox will show a message and let you type instead.
- **The speech recognition is free** and runs through the browser — no API
  key, no cost, nothing to install.
- **The recording is not saved.** Only the recognised text is stored. If
  you want the audio kept too, that needs Firebase Storage — a later step.
- **The AI delegates are not real AI.** Their speeches are written in
  advance (`debate-script.js`, `forum.js`), and they vote by matching the
  words of a motion against their country's researched position — no AI
  service is called, so nothing costs money.
- **A joined delegate who closes their tab without pressing Leave** stays
  listed as in the room, so the Chair's votes wait for them until the clock
  runs out.
- **Your Firebase settings are not secrets.** They are meant to be visible
  in the browser. The security rules in Part 2 are what protect the data.

---

## The files

| File | What it is |
|---|---|
| `signup.html` / `signup.js` | Creating a delegate account |
| `login.html` / `login.js` | Logging back in |
| `board.html` / `board.js` | The **home page**: Create New Meeting popup, upcoming meetings (Join), My meetings, recent results |
| `forums.html` / `forums.js` | **My meetings**: the meetings you chaired, joined, or are in now |
| `results.html` / `results.js` | A saved meeting's **voting results** screen |
| `results-view.js` | Draws the voting-results screen (used by the meeting screen and `results.html`) |
| `profile.html` / `profile.js` | **Profile**: display name, debate history, voting history |
| `debate.html` / `debate.js` | The **meeting screen**: setup, then the live debate, votes, and log |
| `meeting.js` | The shared meeting and its ballots (Firestore) |
| `forum.js` | The seats, AI switches, and discussion feed on the meeting screen |
| `debate-script.js` | The topic, the researched positions, and the written debate |
| `write.html` / `write.js` | Writing or editing a post, by typing or by voice |
| `post.html` / `post.js` | One post's full page |
| `style.css` | How the whole platform looks |
| `firebase-config.js` | **The one file you edit.** Your Firebase settings |
| `countries.js` | The list of delegations. Edit to change the committee |
| `speech.js` | Speech-to-text, shared by the write page |
| `session.js` | Who is logged in, and logging out |
| `serve.py` | Runs the site on your computer |
| `CLAUDE.md` | Working rules for this project |
