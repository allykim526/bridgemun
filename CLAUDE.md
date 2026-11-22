# BridgeMUN

## What this project is

BridgeMUN is an online Model UN simulation platform for high school students.
Students join a committee as delegates, debate current-events topics, and an
**AI delegate** can fill in when there aren't enough human participants.

## Focus topic

The platform's debate focuses on **SDG 10 (reduced inequality), target 10.2**:
digital disparities among older persons — their lack of access to, and
knowledge of, basic technology — with South Korea, Singapore, and the United
Kingdom as the researched delegations. This comes from the BridgeMUN "SDG
Content Task" research. That research (issue, each country's objectives and
red lines, position sentences, sources, and the Korean speech, clause, and
question) lives in `debate-script.js` as structured data, because it is also
meant to become the dataset the AI delegates are built on later. Keep new
topic content there rather than scattering it across files. The topic line
shown on the login, sign-up, start, meeting, and write pages is read from
`DEBATE_TOPIC` / `DEBATE_SDG` in that file — never typed into those pages.
(The AI opening statement for a seat with no research is a general placeholder on this topic; the
United States was not researched, so it must not claim real US policy.)

## Tech stack

Plain HTML, CSS, and JavaScript (no framework, no build step), with:

- **Firebase Authentication** — email/password delegate accounts
- **Firebase Firestore** — stores delegate profiles, posts, which empty
  seats have the AI on, live meetings and their ballots, and saved meeting
  logs
- **Web Speech API** — free, browser-built-in speech-to-text for dictating
  posts. English (`en-US`). Chrome only.
- **ElevenLabs text-to-speech** — speaks the debate simulator's written
  lines aloud. The API key is entered by the delegate in the browser and
  kept only in that browser's local storage — it is never written into any
  file in this project, so it never reaches git or GitHub.

Firebase settings live in `firebase-config.js`. Setup steps are in `SETUP.md`.

## Current stage

Working prototype with real accounts and a real database.

**Built so far:**

- `signup.html` / `login.html` — create a delegate account, or log back in.
- **Home page (`board.html`)** — laid out like a forum start screen (white
  header with logo, **My meetings**, Write, your name, Log out; a big centred
  title and intro; the current agenda). **+ Create New Meeting** opens the
  **Meeting Details** popup (topic, optional subtopic, date, 30/60 min, a
  2–7 country slider with presets and Random, a country search, country
  chips each with an AI switch, ALL ON / ALL OFF, and Save Meeting &
  Continue). It carries the choices to the meeting screen in the address:
  the chosen countries that the AI plays vote as AI delegates, and the
  subtopic and date are stored on the shared meeting and shown under
  Upcoming Meetings. A chosen country with the AI off and no student in the
  room simply does not vote. Under it: "Upcoming Meetings" (meetings
  running now, with **Join** / **Return**, or a note when none) and "Recent
  Results". In the header, **My meetings** opens `forums.html` and your name
  opens `profile.html`.
- **My meetings (`forums.html`)** — one card per meeting you have been in:
  date, **Active / Closed**, topic, your role (Chair or Delegate), and **View
  results** (or **Return** for a running one). Delegate role only shows for
  meetings saved after `memberUids` was added to the saved log.
- **Results (`results.html?log=<id>`)** — the "Voting outcome" screen of a
  saved meeting: resolution card (title, text, submitted by, co-sponsors),
  outcome summary, aggregate tally (counts, %, bars), and a country breakdown
  (country / delegate / vote, AI or human labelled). Drawn by
  `results-view.js`, which the meeting screen's "View Results" pop-over also
  uses, so both look the same.
- **Profile (`profile.html`)** — shows the login email (display only, not
  changeable), a Display name field with Save changes (updates the `users`
  profile), a link to My meetings, Debate history (your posts) and Voting
  history (resolution ballots you cast in meetings saved after ballots began
  recording `uid`).
- **Meeting screen (`debate.html`)** — ONE screen that is both the lobby and
  the live debate, laid out like a reference "forum" screen from another MUN
  platform (topic bar across the top; narrow left column; wide right column).
  Before Start Meeting the right column holds the setup (issue brief, MUN
  guide, who takes part and with what voice/speed/reading level, meeting
  length, silent mode, auto motions, captions, translation, ElevenLabs key);
  pressing **Start Meeting** turns the same screen into the live debate. Two
  classes on `<body>` do this — `is-live` and `is-member` — together with the
  `.only-setup` / `.only-live` / `.host-only` / `.only-member` rules in
  `style.css`. Always shown: "Your delegation", **AI Delegate & Empty Seats**,
  **Delegations**, and the **Discussion Feed** (posts, with Read aloud, and
  Edit/Delete on your own). Live only: a **Remaining** countdown (red in the
  last minute; at zero the debate is held), a **video tile** (Join audio /
  Start Video are UI-only switches — no live call exists, and the panel says
  so), a **Moderator** panel (Open/Close **floor voting**, which gates every
  vote and ends one in progress when closed; and a **current speaker** line),
  the speaker's stage, the procedural vote, the resolution vote, the Agenda,
  and the Meeting Log.
- **Joining.** A delegate who opens a running meeting (`debate.html?meeting=
  <id>`) takes a seat in it. Their screen mirrors what the Chair publishes to
  the shared meeting (Firestore `meetings`): time left, floor voting, who is
  speaking and what they say, and the open vote. The Chair's controls are
  hidden for them. A joined delegate can **Leave**; the delegate who started
  the meeting can also **End meeting for everyone** from the joined view
  (e.g. after reloading their own screen). Sharing code lives in `meeting.js`.
- **Who votes — and who does not.** The Chair NEVER chooses another
  delegation's vote. Every delegation in the room votes for itself:
  a student playing that country (the Chair, or anyone who joined) votes from
  their own screen; every other voting delegation is an **AI delegate** and
  votes by itself after a short pause. Voters are: the delegations speaking in
  the debate, every student in the room (for their own country), and every
  AI-held seat; each country once. A student's ballot is its own Firestore
  document (`meetings/<id>/ballots/<voteId>__<Country>`), created once by that
  student and never changed. Whoever has not voted when the clock runs out (or
  the Chair closes the vote early) is simply not counted.
- **How AI delegates vote** (`aiVote` in `debate.js`, data in
  `VOTING_PROFILES` in `debate-script.js`). No AI service is called. It looks
  for phrases in the motion/resolution that fit the country's researched
  position, or cross its red lines (which weigh double), and shows those
  phrases as its reason. Resolution: more support than opposition → Yes; a red
  line crossed → No; nothing relevant → Abstain. Procedural motion: a red line
  crossed → No, otherwise a routine vote (mostly Yes — research has no
  position on procedure). A country with no research uses a general profile
  and says so. The results screen lists every delegation's vote, labelled AI
  delegate or human delegate, with the AI's reason.
- **Votes.** **Motions & Votes** (the quick vote): **+ New vote** opens an
  input form on the same screen — a motion/question and "Options (one per
  line)", default Yes / No / Abstain. Only Yes, No and Abstain are accepted
  (Yes and No are required; delete the Abstain line for a vote with no
  abstentions); anything else is refused. 15 s (30 s when other students vote
  too). While open it shows an OPEN badge, each option's votes and %, a ballot
  count, and **Close** / **Delete** (Delete throws the vote away uncounted).
  When closed it shows a CLOSED badge, the chart, and **Reopen**, which lets
  only the delegations that have not voted yet vote — a cast ballot can never
  be changed. **Resolution vote**: the Chair types the resolution by hand
  (never AI-generated, so the project stays free to run) with Submitted by and
  Co-sponsors; **Save resolution**, **AI draft** and **Generate summary** are
  placeholder buttons that say no AI is connected. Yes (For) / No (Against) /
  Abstain, 20 s (30 s with students), with a live tally, "Cast your vote"
  (shown switched off for anyone whose delegation is not voting — nobody can
  vote for another delegation) and **Finalize ballots**. A simple majority of
  Yes against No decides it (a tie fails; abstentions count for neither
  side). **View Results** opens the Voting outcome screen over the meeting.
  "Wrap Up Meeting" ends the meeting.
- **Ending a meeting.** "End meeting & save" or "Wrap Up Meeting" (the only two
  ways) save the meeting log once to Firestore (`debateLogs`) — including the
  resolution's title, text, submitters, outcome, and each delegation's ballot
  (with who cast it) — mark the
  shared meeting ended (joined screens return to the start page), and send the
  Chair to Home. Finishing the script does not save on its own.
- If the shared meeting cannot be created (typically the Firestore rules in
  `SETUP.md` not published yet) the meeting still runs on the Chair's screen
  with AI delegates voting, and says "not shared".
- AI delegates can raise motions from a written list in `debate-script.js` (no
  AI service): the Chair asks for one with a button, or — if switched on at
  setup — one may be raised by itself between speeches. Each is labelled as an
  AI delegate; the Chair puts it to a procedural vote or rules it out of order.
  A passed motion is only recorded in the meeting log; the simulation does not
  act on it.
- **Silent mode**: no voice, no ElevenLabs key. Each line shows as a caption for
  about as long as it would take to say, then moves on; Pause and calling a
  vote both stop it.
- Each empty seat has an **AI ON/OFF** switch (Firestore `seats`, shared; a
  student who takes the seat always wins over the AI) and a **Generate** button
  posting that seat's opening statement as an AI-labelled post: the placeholder
  for the permanent AI seat, the researched speech for a delegation that has
  one, or the placeholder reworded for any other country (no claim about real
  policy).
- `write.html` — writing a post by typing or by voice, or editing your own
  (`write.html?edit=<id>`, which then shows "(edited)"); `post.html` — one
  post's full page.
- An "Issue Brief & Country Positions" panel, a collapsible "New to MUN? How
  This Works" guide, a timestamped Meeting Log with a Copy button (it records
  every ballot, saying AI delegate or human delegate), and "Saved Meeting
  Logs" — all on the meeting screen's setup.

**Deliberately not built yet:**

- Real AI. The AI board speech is hardcoded in `board.js`, and the debate
  simulator's script is hardcoded in `debate-script.js` — both clearly
  marked.
- Points of order (voting and motions exist now; see above)
- Custom vote options beyond Yes / No / Abstain, and AI-written resolutions or
  summaries (the buttons are placeholders)
- Saving the audio of a recording (only the transcript is kept)
- Multiple committees (there is one)
- Live video or audio between delegates (the meeting room's video tile is
  a UI-only switch)
- Live translation. Only Korean captions are written out in
  `debate-script.js`; there is no real translation service behind it yet.

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

- **Never hide whether a delegate is human or AI.** Every post, every roster
  row, and every ballot is labelled. This is a core promise of the platform.
- **The Chair never chooses anyone else's vote.** AI delegates vote by
  themselves and students vote for their own country; nothing may let the
  person running the meeting cast, change, or fill in another delegation's
  ballot.
- **Anything a delegate writes is inserted as plain text**, never as HTML, so a
  typed post can never affect the page itself.
- **One source of truth per thing.** The delegation list lives only in
  `countries.js`; colours live only at the top of `style.css`; the Firebase
  connection lives only in `firebase-config.js`.
