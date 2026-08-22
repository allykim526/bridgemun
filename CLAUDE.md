# BridgeMUN

## What this project is

BridgeMUN is an online Model UN simulation platform for high school students.
Students join a committee as delegates, debate current-events topics, and an
**AI delegate** can fill in when there aren't enough human participants.

## Tech stack

Plain HTML, CSS, and JavaScript (no framework, no build step), with:

- **Firebase Authentication** — email/password delegate accounts
- **Firebase Firestore** — stores delegate profiles and posts
- **Web Speech API** — free, browser-built-in speech-to-text for dictating
  posts. English (`en-US`). Chrome only.

Firebase settings live in `firebase-config.js`. Setup steps are in `SETUP.md`.

## Current stage

Working prototype with real accounts and a real database.

**Built so far, as five pages:**

- `signup.html` / `login.html` — create a delegate account, or log back in
- `board.html` — the roster (seated / vacant / AI seats) and every post,
  newest first, numbered like an official record
- `write.html` — writing a post by typing or by voice
- `post.html` — one post's full page
- A button on the board making the AI delegate publish a sample opening
  speech as a post
- A delegate can delete their own post, from the board or from the post's
  own page

**Deliberately not built yet:**

- Real AI. The AI speech is hardcoded in `board.js` and clearly marked.
- Voting, motions, points of order
- Saving the audio of a recording (only the transcript is kept)
- Multiple committees (there is one)
- Editing a post after it is published

Do not add features beyond what was asked for.

## Rules for working on this project

### 1. Comment the code as you write it

Every meaningful piece of code gets a comment explaining **what it does** and
**what its job is inside the platform** — not just the mechanics. For example:
"builds the delegate list panel — this is where students see who is in the
committee and which delegate is the AI."

Write comments for a reader who is learning to code, not for an expert.

### 2. Make small changes, not rewrites

When asked to add or change something, edit only the parts that need to change.
Do not rebuild files from scratch, do not reorganize working code, and do not
"improve" things that were not part of the request. Existing behavior should keep
working exactly as it did. If a request genuinely requires a large rewrite, say so
first rather than doing it quietly.

### 3. Explain the changes afterwards in plain language

After finishing a task, give a short summary of what was changed and why, written
so a non-programmer can follow it. Say which files were touched, what was added or
modified, and what visibly changed as a result. No jargon unless it is explained.

## Things to keep true

- **Never hide whether a delegate is human or AI.** Every post and every
  roster row is labelled. This is a core promise of the platform.
- **Anything a delegate writes is inserted as plain text**, never as HTML, so a
  typed post can never affect the page itself.
- **One source of truth per thing.** The delegation list lives only in
  `countries.js`; colours live only at the top of `style.css`; the Firebase
  connection lives only in `firebase-config.js`.
