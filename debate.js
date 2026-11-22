/* =====================================================================
   debate.js — the meeting screen

   What this file does:
   Runs debate.html, one screen that changes as the meeting goes on.

   BEFORE THE MEETING STARTS the Chair (whoever opened the page) picks
   which delegations take part and, for each, a voice, a speaking speed,
   and whether it uses simpler English; sets the meeting length and a few
   options; and presses Start Meeting.

   ONCE IT STARTS the same screen turns into the live debate: the written
   lines from debate-script.js that belong to the chosen delegations are
   spoken aloud with ElevenLabs (or shown as captions in silent mode), one
   at a time, with a countdown, floor voting, motions, procedural votes, a
   resolution vote, and a meeting log.

   OTHER DELEGATES can open the same meeting from the start page and join.
   Their screen shows the same debate but without the Chair's controls.

   WHO VOTES. The Chair never chooses anyone else's vote. Every delegation
   in the room votes for itself:
     - an AI delegate (an AI-held seat, or any speaking delegation no
       student is playing) votes by itself, by its country's researched
       position, and shows the reason;
     - a student who has joined votes for their own country, from their
       own screen. The Chair is such a student too, for the Chair's own
       country.

   Nothing here writes new debate content. The words are all already in
   debate-script.js; this file only decides which of them to say, and how.
   When a meeting ends it is saved to this project's Firestore ("debateLogs").
   The pieces shared between screens live in meeting.js (the shared
   meeting and its ballots) and forum.js (seats and the discussion feed).
===================================================================== */

import { db } from "./firebase-config.js";
import { requireLogin, attachNav } from "./session.js";
import { COUNTRIES } from "./countries.js";
import { startForum, getRosterState } from "./forum.js";
import { renderResultsView } from "./results-view.js";
import {
  createMeeting, watchMeeting, updateMeeting, joinMeeting, leaveMeeting,
  castBallot, watchBallots
} from "./meeting.js";
import {
  DEBATE_TOPIC, DEBATE_PARTICIPANTS, DEBATE_SCRIPT, LANGUAGE_NAMES, AI_MOTIONS,
  DEBATE_SDG, ISSUE_BRIEF, COUNTRY_BRIEFS, VOTING_PROFILES, DEFAULT_VOTING_PROFILE
} from "./debate-script.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------------------------------------------------------------
// THE PARTS OF THE PAGE THIS FILE WRITES INTO
// ---------------------------------------------------------------------
const debateTopic       = document.getElementById("debateTopic");
const apiKeyInput        = document.getElementById("apiKeyInput");
const loadVoicesButton   = document.getElementById("loadVoicesButton");
const voiceStatus        = document.getElementById("voiceStatus");
const participantList    = document.getElementById("participantList");
const participantCount   = document.getElementById("participantCount");
const captionsToggle     = document.getElementById("captionsToggle");
const silentToggle       = document.getElementById("silentToggle");
const translateToggle    = document.getElementById("translateToggle");
const translateLanguageSelect = document.getElementById("translateLanguageSelect");
const startButton        = document.getElementById("startButton");
const setupError         = document.getElementById("setupError");

const phaseBadge     = document.getElementById("phaseBadge");
const leaveButton    = document.getElementById("leaveButton");
const endForAllButton = document.getElementById("endForAllButton");
const agendaList      = document.getElementById("agendaList");
const agendaProgress  = document.getElementById("agendaProgress");
const stageAvatar     = document.getElementById("stageAvatar");
const stageCountry    = document.getElementById("stageCountry");
const stageLabel      = document.getElementById("stageLabel");
const stageCaption    = document.getElementById("stageCaption");
const stageTranslation = document.getElementById("stageTranslation");
const stageStatus     = document.getElementById("stageStatus");
const playPauseButton = document.getElementById("playPauseButton");
const prevButton      = document.getElementById("prevButton");
const nextButton      = document.getElementById("nextButton");
const endButton       = document.getElementById("endButton");
const debateAudio     = document.getElementById("debateAudio");

const autoMotionsToggle    = document.getElementById("autoMotionsToggle");
const proceduralVotePanel  = document.getElementById("proceduralVotePanel");
const raiseAiMotionButton  = document.getElementById("raiseAiMotionButton");
const aiMotionHint         = document.getElementById("aiMotionHint");
const aiMotionPanel        = document.getElementById("aiMotionPanel");
const aiMotionFlag         = document.getElementById("aiMotionFlag");
const aiMotionCountry      = document.getElementById("aiMotionCountry");
const aiMotionText         = document.getElementById("aiMotionText");
const aiMotionVoteButton   = document.getElementById("aiMotionVoteButton");
const aiMotionRejectButton = document.getElementById("aiMotionRejectButton");
const voteMotionOrigin     = document.getElementById("voteMotionOrigin");

const voteIdle          = document.getElementById("voteIdle");
const voteMotionForm    = document.getElementById("voteMotionForm");
const voteMotionInput   = document.getElementById("voteMotionInput");
const voteOpenPanel     = document.getElementById("voteOpenPanel");
const voteResultsPanel  = document.getElementById("voteResultsPanel");
const voteMotionDisplay = document.getElementById("voteMotionDisplay");
const voteTimer         = document.getElementById("voteTimer");
const voteBallotList    = document.getElementById("voteBallotList");
const voteResultMotion  = document.getElementById("voteResultMotion");
const voteChart         = document.getElementById("voteChart");
const voteVerdict       = document.getElementById("voteVerdict");
const callVoteButton    = document.getElementById("callVoteButton");
const cancelVoteButton  = document.getElementById("cancelVoteButton");
const openVoteButton    = document.getElementById("openVoteButton");
const closeVoteButton   = document.getElementById("closeVoteButton");
const dismissVoteButton = document.getElementById("dismissVoteButton");
const voteOptionsInput  = document.getElementById("voteOptionsInput");
const voteFormError     = document.getElementById("voteFormError");
const voteLiveTally     = document.getElementById("voteLiveTally");
const voteBallotCount   = document.getElementById("voteBallotCount");
const deleteVoteButton  = document.getElementById("deleteVoteButton");
const reopenVoteButton  = document.getElementById("reopenVoteButton");
const deleteClosedVoteButton = document.getElementById("deleteClosedVoteButton");

const resVoteIdle           = document.getElementById("resVoteIdle");
const resVoteForm           = document.getElementById("resVoteForm");
const resolutionTitleInput  = document.getElementById("resolutionTitleInput");
const resolutionTextInput   = document.getElementById("resolutionTextInput");
const resVoteOpenPanel      = document.getElementById("resVoteOpenPanel");
const resVoteResultsPanel   = document.getElementById("resVoteResultsPanel");
const resVoteDisplayTitle   = document.getElementById("resVoteDisplayTitle");
const resVoteDisplayText    = document.getElementById("resVoteDisplayText");
const resVoteTimer          = document.getElementById("resVoteTimer");
const resVoteBallotList     = document.getElementById("resVoteBallotList");
const resVoteResultTitle    = document.getElementById("resVoteResultTitle");
const resVoteChart          = document.getElementById("resVoteChart");
const resVoteVerdict        = document.getElementById("resVoteVerdict");
const writeResolutionButton = document.getElementById("writeResolutionButton");
const cancelResVoteButton   = document.getElementById("cancelResVoteButton");
const openResVoteButton     = document.getElementById("openResVoteButton");
const closeResVoteButton    = document.getElementById("closeResVoteButton");
const wrapUpButton          = document.getElementById("wrapUpButton");
const backToResVoteButton   = document.getElementById("backToResVoteButton");
const resolutionSubmittedInput   = document.getElementById("resolutionSubmittedInput");
const resolutionCosponsorsInput  = document.getElementById("resolutionCosponsorsInput");
const resSummaryCount       = document.getElementById("resSummaryCount");
const resFormHint           = document.getElementById("resFormHint");
const resSaveButton         = document.getElementById("resSaveButton");
const resAiDraftButton      = document.getElementById("resAiDraftButton");
const resGenerateSummaryButton = document.getElementById("resGenerateSummaryButton");
const resVoteDisplayBy      = document.getElementById("resVoteDisplayBy");
const resCastNotice         = document.getElementById("resCastNotice");
const resLiveTally          = document.getElementById("resLiveTally");
const resVoteBallotCount    = document.getElementById("resVoteBallotCount");
const reopenResVoteButton   = document.getElementById("reopenResVoteButton");
const resViewResultsButton  = document.getElementById("resViewResultsButton");
const resultsOverlay        = document.getElementById("resultsOverlay");
const resultsBody           = document.getElementById("resultsBody");

const debateSdg         = document.getElementById("debateSdg");
const briefToggleButton = document.getElementById("briefToggleButton");
const briefBody         = document.getElementById("briefBody");

const meetingLengthSelect = document.getElementById("meetingLengthSelect");
const timerCard           = document.getElementById("timerCard");
const remainingTime       = document.getElementById("remainingTime");
const videoCard           = document.querySelector(".forum-video");
const videoAvatar         = document.getElementById("videoAvatar");
const videoName           = document.getElementById("videoName");
const videoStatus         = document.getElementById("videoStatus");
const joinAudioButton     = document.getElementById("joinAudioButton");
const videoToggleButton   = document.getElementById("videoToggleButton");
const floorBox            = document.getElementById("floorBox");
const floorText           = document.getElementById("floorText");
const floorToggleButton   = document.getElementById("floorToggleButton");
const activeSpeaker       = document.getElementById("activeSpeaker");
const timeUpNotice        = document.getElementById("timeUpNotice");

const guideToggleButton = document.getElementById("guideToggleButton");
const guideBody         = document.getElementById("guideBody");

const logList        = document.getElementById("logList");
const copyLogButton  = document.getElementById("copyLogButton");

const savedLogList  = document.getElementById("savedLogList");
const savedLogCount = document.getElementById("savedLogCount");

// The API key lives only in this browser's storage — it is never
// written into any file this project ships, so it never ends up in
// git or on GitHub.
const API_KEY_STORAGE_KEY = "bridgemun_elevenlabs_key";

// Remembers whether this browser has already collapsed the MUN
// procedure guide, so a delegate who has seen it once is not shown it
// expanded again on every visit.
const GUIDE_HIDDEN_STORAGE_KEY = "bridgemun_debate_guide_hidden";

// Same idea for the Issue Brief panel.
const BRIEF_HIDDEN_STORAGE_KEY = "bridgemun_debate_brief_hidden";

// Every delegation's current setup-screen choices, keyed by country
// name. Filled in as the participant list is built, and updated live
// as the delegate changes a checkbox or dropdown.
const participantSettings = {};

// The voices ElevenLabs says this account can use, fetched once the
// delegate saves a key. Left empty until then.
let availableVoices = [];

// The debate currently being played: the filtered list of script steps,
// which index we are on, and whether audio for a step has already been
// generated (so pressing Previous does not re-pay for the same line).
let playlist = [];
let currentIndex = -1;
let audioCache = {};
let isPaused = false;

// SILENT MODE — a debate with no voice at all, so it can be run (and
// voted on) without an ElevenLabs key. Each line is shown as a caption
// for roughly as long as it would take to say aloud, then the debate
// moves on by itself. silentMode is fixed when the debate starts; the
// rest track the on-screen timer so Pause and "call a vote" can stop it
// and later pick up where it left off.
let silentMode = false;

// What the home page's Meeting Details popup chose: the date, an optional
// subtopic, the participating countries, and which of them the AI plays.
// Empty when the meeting was opened some other way.
const launchOptions = { date: "", subtopic: "", countries: [], aiCountries: [] };
let silentTimerId = null;
let silentRemainingMs = 0;
let silentStartedAt = 0;
const SILENT_WORDS_PER_SECOND = 2.5;
const SILENT_MIN_SECONDS = 4;

// AI-RAISED MOTIONS — which of the written motions in debate-script.js
// have already been raised this debate (so none repeats), the motion
// currently waiting on the Chair, whether delegations may raise them on
// their own, how many lines have been spoken since the last one, and —
// when a motion interrupts the debate between two lines — what to do to
// carry on once the Chair has dealt with it.
let usedMotionIndexes = [];
let currentAiMotion = null;
let autoMotions = false;
let linesSinceMotion = 0;
let pendingResume = null;

// How likely an AI delegate is to raise a motion at each break between
// speeches, once at least MIN_LINES_BETWEEN_MOTIONS lines have passed.
const AUTO_MOTION_CHANCE = 0.4;
const MIN_LINES_BETWEEN_MOTIONS = 2;

// THE MEETING ROOM CONTROLS — when the meeting's time runs out and the
// clock ticking toward it, whether the Chair has floor voting open (new
// votes can only be called while it is), and the two switches on the
// video tile.
let meetingEndsAt = 0;
let timerId = null;
let floorVotingOpen = true;
let audioJoined = false;
let videoOn = false;

// Who is logged in and running this debate — filled in once
// requireLogin resolves, and needed later to save a meeting log under
// this delegate's name.
let me = null;

// The meeting log: every entry that has happened so far this debate.
// activeLogEntry tracks the line currently being spoken — which
// playlist index it is, and when it started — so its duration can be
// worked out and logged once the debate moves on to something else.
let meetingLog = [];
let activeLogEntry = null;

// THE VOTE ENGINE'S STATE — the vote currently open (or just closed) on
// this screen, with its voters, ballots, clock, and result; and the draft
// resolution's title, text, and outcome, kept so they can be saved with the
// meeting log when the Chair wraps up. (The vote engine itself is further
// down, under VOTING.)
let activeVote = null;
let resolutionTitle = "";
let resolutionText = "";
let resolutionResult = null;
let resolutionSubmittedBy = "";
let resolutionCosponsors = "";
// The most recent resolution vote this screen has seen (the Chair's own, or
// the one a joined delegate was told about) — what "View Results" shows.
let shownResolution = null;

// THE SHARED MEETING — the id of the meeting document other delegates can
// join (null if sharing is not available), whether THIS screen belongs to
// a delegate who joined someone else's meeting, the meeting's latest
// contents, and the things to stop listening to when leaving.
let meetingId = null;
let isMemberMode = false;
let meetingData = null;
let unwatchMeeting = null;
let unwatchBallots = null;
let sharingProblemShown = false;

/* =====================================================================
   THE MUN PROCEDURE GUIDE
   A collapsible explainer, expanded by default so a delegate who has
   never done MUN before sees it as soon as the page loads. Once
   someone collapses it, that choice is remembered for next time.
===================================================================== */
function setGuideHidden(hidden) {
  guideBody.classList.toggle("is-hidden", hidden);
  guideToggleButton.textContent = hidden ? "Show guide" : "Hide guide";
  localStorage.setItem(GUIDE_HIDDEN_STORAGE_KEY, hidden ? "1" : "0");
}

guideToggleButton.addEventListener("click", function () {
  setGuideHidden(!guideBody.classList.contains("is-hidden"));
});

/* =====================================================================
   THE MEETING ROOM CONTROLS
   What the live meeting adds around the debate itself: a countdown to the
   end of the meeting, a line saying who has the floor, the Chair's
   switch for opening and closing floor voting, and the delegate's video
   tile.
===================================================================== */

/* "mm:ss" for a number of milliseconds. */
function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

/* Starts the countdown from the meeting length picked on the setup
   screen. It runs in real time and does not stop for pauses or votes,
   like the clock in a real session. */
function startMeetingTimer() {
  meetingEndsAt = Date.now() + Number(meetingLengthSelect.value) * 60000;
  runMeetingTimer();
}

/* Runs the on-screen countdown toward meetingEndsAt. The Chair's screen
   sets that time itself; a joined delegate's screen reads it from the
   shared meeting, so both count down to the same moment. */
function runMeetingTimer() {
  timeUpNotice.textContent = "";
  clearInterval(timerId);
  updateMeetingTimer();
  timerId = setInterval(updateMeetingTimer, 1000);
}

function updateMeetingTimer() {
  const left = meetingEndsAt - Date.now();
  remainingTime.textContent = formatCountdown(left);
  timerCard.classList.toggle("is-low", left <= 60000);

  if (left <= 0) {
    clearInterval(timerId);
    onMeetingTimeUp();
  }
}

/* The allotted time is over: the debate is held where it is (the Chair
   can still press Play to carry on) and the Chair is told to wrap up. */
function onMeetingTimeUp() {
  if (isMemberMode) {
    timeUpNotice.textContent = "Time is up. The Chair will wrap up the meeting.";
    return;
  }

  logNow("⏰ Time is up — the meeting's allotted time has run out.", "system");
  pauseForVote();
  setActiveSpeaker(null);
  timeUpNotice.textContent = "Time is up. Wrap up the meeting with the resolution vote, or end it.";
}

/* Shows who has the floor — or "No active speaker" when the debate is
   paused, between lines, held for a vote, or finished. */
function setActiveSpeaker(step) {
  activeSpeaker.classList.toggle("has-speaker", Boolean(step));
  activeSpeaker.textContent = step
    ? "Speaking now: " + step.flag + " " + step.speaker + " — " + step.label
    : "No active speaker";

  // The Chair's screen also tells the shared meeting who is speaking and
  // what they are saying, so delegates who joined can follow along.
  if (!isMemberMode && meetingId) {
    publishMeeting({
      now: step ? {
        flag: step.flag,
        speaker: step.speaker,
        label: step.label,
        caption: settingsFor(step).simpleEnglish ? step.simple : step.formal
      } : null
    });
  }
}

/* Changes fields on the shared meeting, if there is one. A failure (most
   often the Firestore rules not being published yet) is reported once and
   otherwise ignored, so the meeting keeps running on this screen. */
function publishMeeting(patch) {
  if (!meetingId || isMemberMode) return;

  updateMeeting(meetingId, patch).catch(function (error) {
    if (sharingProblemShown) return;
    sharingProblemShown = true;
    phaseBadge.textContent = "Live · not shared";
    logNow("Could not share this meeting with other students: " + error.message, "system");
  });
}

/* Floor voting is the Chair's gate on voting. While it is closed, nothing
   that starts a vote can be pressed; closing it while a vote is open ends
   that vote on the spot, with whatever ballots are in. */
function applyFloorVotingState() {
  floorToggleButton.textContent = floorVotingOpen ? "Close floor voting" : "Open floor voting";
  floorToggleButton.classList.toggle("is-open-state", !floorVotingOpen);
  floorBox.classList.toggle("is-closed", !floorVotingOpen);
  floorText.textContent = floorVotingOpen
    ? "Open — delegations can vote on motions and on the resolution."
    : "Closed — no new vote can be called until the Chair opens floor voting again.";

  [callVoteButton, raiseAiMotionButton, openVoteButton, aiMotionVoteButton,
   writeResolutionButton, openResVoteButton].forEach(function (button) {
    button.disabled = !floorVotingOpen;
  });
}

floorToggleButton.addEventListener("click", function () {
  floorVotingOpen = !floorVotingOpen;
  logNow("Floor voting " + (floorVotingOpen ? "opened" : "closed") + " by the Chair.", "vote");

  // Closing floor voting ends any vote in progress, with the ballots in so far.
  if (!floorVotingOpen) closeActiveVote();

  applyFloorVotingState();
  publishMeeting({ floorOpen: floorVotingOpen });
});

/* The video tile. Join audio and Start Video work as switches, and the tile
   shows their state, but no live call with other delegates is connected
   yet — the panel says so. */
function renderVideoTile() {
  joinAudioButton.textContent = audioJoined ? "Leave audio" : "Join audio";
  videoToggleButton.textContent = videoOn ? "Stop Video" : "Start Video";
  videoStatus.textContent =
    (audioJoined ? "Audio on" : "Audio off") + " · " + (videoOn ? "Camera on" : "Camera off");
  videoCard.classList.toggle("is-video-on", videoOn);
}

joinAudioButton.addEventListener("click", function () {
  audioJoined = !audioJoined;
  renderVideoTile();
});

videoToggleButton.addEventListener("click", function () {
  videoOn = !videoOn;
  renderVideoTile();
});

/* =====================================================================
   THE ISSUE BRIEF & COUNTRY POSITIONS
   Explains the focus topic before the debate starts: which SDG it falls
   under, who is affected and why it matters now, one key fact, and what
   each researched delegation wants and will not give up. Everything is
   read from debate-script.js and inserted as plain text.
===================================================================== */

/* Small helper: makes one element with optional class and plain text. */
function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildBrief() {
  briefBody.innerHTML = "";

  // Which goal and target this debate is about.
  const chips = makeEl("div", "debate-brief-chips");
  chips.append(
    makeEl("span", "debate-brief-chip", DEBATE_SDG.goal),
    makeEl("span", "debate-brief-chip", DEBATE_SDG.target)
  );
  briefBody.appendChild(chips);

  briefBody.append(
    makeEl("p", "debate-brief-title", "The issue"),
    makeEl("p", "debate-brief-text", ISSUE_BRIEF.focus),
    makeEl("p", "debate-brief-title", "Who is affected, and why it matters now")
  );
  ISSUE_BRIEF.affected.forEach(function (paragraph) {
    briefBody.appendChild(makeEl("p", "debate-brief-text", paragraph));
  });

  const fact = makeEl("p", "debate-brief-fact", ISSUE_BRIEF.fact.text);
  fact.appendChild(makeEl("span", "debate-brief-source", "Source: " + ISSUE_BRIEF.fact.source));
  briefBody.append(makeEl("p", "debate-brief-title", "A key fact"), fact);

  // One expandable block per delegation, in the same order as setup.
  briefBody.appendChild(makeEl("p", "debate-brief-title", "Country positions"));
  DEBATE_PARTICIPANTS.forEach(function (participant) {
    const brief = COUNTRY_BRIEFS[participant.country];
    if (!brief) return;

    const block = makeEl("details", "debate-country-brief");
    block.appendChild(makeEl("summary", "", participant.flag + " " + participant.country));

    block.appendChild(makeEl("p", "debate-brief-title", "What it wants the international community to do"));
    brief.wants.forEach(function (paragraph) {
      block.appendChild(makeEl("p", "debate-brief-text", paragraph));
    });

    block.append(
      makeEl("p", "debate-brief-title", "Red line"),
      makeEl("p", "debate-brief-text", brief.redLine),
      makeEl("p", "debate-brief-title", "Position"),
      makeEl("p", "debate-brief-text debate-brief-position", brief.position),
      makeEl("p", "debate-brief-title", "Sources")
    );

    const sources = makeEl("ul", "debate-brief-sources");
    brief.sources.forEach(function (url) {
      const item = makeEl("li");
      const link = makeEl("a", "", url);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.appendChild(link);
      sources.appendChild(item);
    });
    block.appendChild(sources);

    briefBody.appendChild(block);
  });
}

function setBriefHidden(hidden) {
  briefBody.classList.toggle("is-hidden", hidden);
  briefToggleButton.textContent = hidden ? "Show brief" : "Hide brief";
  localStorage.setItem(BRIEF_HIDDEN_STORAGE_KEY, hidden ? "1" : "0");
}

briefToggleButton.addEventListener("click", function () {
  setBriefHidden(!briefBody.classList.contains("is-hidden"));
});

/* =====================================================================
   THE MEETING LOG
   A record of what actually happened, in order: the debate starting,
   each delegation's turn (with a clock time and how long it spoke
   for), every procedural vote called and how it came out, and the
   debate ending. Nothing here is invented — every entry corresponds to
   something this page just did.
===================================================================== */
function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderLogEntry(entry) {
  const item = document.createElement("li");
  item.className = "debate-log-entry is-" + entry.kind;
  item.innerHTML = '<span class="debate-log-time"></span><span class="debate-log-text"></span>';
  item.querySelector(".debate-log-time").textContent = formatClock(entry.time);
  item.querySelector(".debate-log-text").textContent = entry.text;
  logList.appendChild(item);
  logList.scrollTop = logList.scrollHeight;
}

/* Adds one entry to the log with an explicit time — used when logging
   something (like a finished speech) after the fact, so the log shows
   when it started rather than when it was written down. */
function addLogEntry(time, text, kind) {
  const entry = { time: time, text: text, kind: kind };
  meetingLog.push(entry);
  renderLogEntry(entry);
}

/* Adds one entry stamped with the current time — for things that are
   logged the moment they happen, like a vote being called. */
function logNow(text, kind) {
  addLogEntry(new Date(), text, kind);
}

/* If a delegation is mid-turn, writes down how long it actually spoke
   for (from when it started to right now) and clears the marker, so
   the next line can start its own clock. Called every time playback
   moves to a different line, so no turn goes unlogged. */
function finalizeActiveLogEntry() {
  if (!activeLogEntry) return;

  const step = activeLogEntry.step;
  const seconds = Math.max(1, Math.round((Date.now() - activeLogEntry.startedAt) / 1000));
  const isChair = step.kind === "chair";

  addLogEntry(
    activeLogEntry.startClock,
    step.flag + " " + step.speaker + " — " + step.label + " (" + seconds + "s)",
    isChair ? "system" : "speech"
  );

  activeLogEntry = null;
}

copyLogButton.addEventListener("click", async function () {
  const text = meetingLog
    .map(function (entry) { return "[" + formatClock(entry.time) + "] " + entry.text; })
    .join("\n");

  try {
    await navigator.clipboard.writeText(text || "The meeting log is empty so far.");
    copyLogButton.textContent = "Copied!";
  } catch (error) {
    copyLogButton.textContent = "Could not copy";
  }
  setTimeout(function () { copyLogButton.textContent = "Copy"; }, 1500);
});

/* =====================================================================
   SAVING THE MEETING LOG TO FIREBASE
   Called once a debate ends. Writes the whole log as one document in
   Firestore's "debateLogs" collection — the same Firebase project
   every other page in BridgeMUN uses — so it survives a refresh and
   can be looked back on later.
===================================================================== */
async function saveMeetingLog() {
  if (!me || meetingLog.length === 0) return;

  try {
    await addDoc(collection(db, "debateLogs"), {
      uid: me.uid,
      name: me.name,
      country: me.country,
      // Everyone who was in the room, so each student's "My meetings" can
      // list the meetings they took part in, not only the ones they chaired.
      memberUids: currentMembers().map(function (m) { return m.uid; }),
      topic: DEBATE_TOPIC,
      subtopic: launchOptions.subtopic,
      scheduledDate: launchOptions.date,
      participants: getVotingParticipants().map(function (p) { return p.country; }),
      // Firestore cannot store a plain JS Date inside an array, so each
      // entry's time is kept as text and turned back into a time when
      // the saved log is displayed.
      entries: meetingLog.map(function (entry) {
        return { time: entry.time.toISOString(), text: entry.text, kind: entry.kind };
      }),
      // Only present if a resolution vote actually happened this
      // session — Firestore does not accept "undefined" fields, so a
      // debate with no resolution vote simply saves null here.
      resolution: resolutionResult ? {
        title: resolutionTitle,
        text: resolutionText,
        submittedBy: resolutionSubmittedBy || me.country,
        coSponsors: resolutionCosponsors,
        yes: resolutionResult.yesCount,
        no: resolutionResult.noCount,
        abstain: resolutionResult.abstainCount,
        passed: resolutionResult.passed,
        // Who voted how, and whether each was an AI delegate or a student.
        ballots: resolutionResult.ballots || []
      } : null,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    logNow("Could not save this meeting log to Firebase: " + error.message, "system");
  }
}

/* Ends the meeting for good: stops any voice, silent-mode timer, or vote
   clock, saves the meeting log to Firebase — waiting a few seconds for it,
   so leaving the page does not cut the save off — and returns to the
   home page, where the result shows up under "Motions & Votes". Ending
   early, wrapping up after the resolution vote, and the "End meeting"
   button all end here, so a meeting is only ever saved once. */
let meetingEnding = false;

async function finishMeetingAndGoHome() {
  if (meetingEnding) return;
  meetingEnding = true;

  clearTimeout(silentTimerId);
  clearInterval(timerId);
  if (activeVote) {
    clearInterval(activeVote.timerId);
    activeVote.aiTimers.forEach(clearTimeout);
  }
  debateAudio.pause();

  stageStatus.className = "record-hint";
  stageStatus.textContent = "Saving the meeting log…";
  endButton.disabled = true;
  wrapUpButton.disabled = true;

  // Save the log, and tell everyone else in the room the meeting is over.
  const closeShared = meetingId
    ? updateMeeting(meetingId, { status: "ended", vote: null, now: null }).catch(function () {})
    : Promise.resolve();

  await Promise.race([
    Promise.all([saveMeetingLog(), closeShared]),
    new Promise(function (resolve) { setTimeout(resolve, 4000); })
  ]);

  if (unwatchMeeting) unwatchMeeting();
  if (unwatchBallots) unwatchBallots();
  window.location.href = "board.html";
}

/* =====================================================================
   SAVED MEETING LOGS
   Lists every meeting log saved so far, newest first. Each one starts
   collapsed — clicking it shows its entries, drawn the same way as the
   live log above.
===================================================================== */
function renderSavedLog(data) {
  const item = document.createElement("li");
  item.className = "debate-saved-log-item";

  item.innerHTML =
    '<button class="debate-saved-log-head" type="button">' +
      '<span class="debate-saved-log-date"></span>' +
      '<span class="debate-saved-log-meta"></span>' +
    '</button>' +
    '<ul class="debate-log-list is-hidden"></ul>';

  const dateText = data.createdAt && data.createdAt.toDate
    ? data.createdAt.toDate().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Just now";

  const resolutionNote = data.resolution
    ? " · " + (data.resolution.passed ? "ADOPTED" : "FAILED") + " \"" + data.resolution.title + "\""
    : "";

  item.querySelector(".debate-saved-log-date").textContent = dateText;
  item.querySelector(".debate-saved-log-meta").textContent =
    (data.participants || []).join(", ") + " · " +
    (data.entries || []).length + " entries · run by " + data.name + resolutionNote;

  const entriesList = item.querySelector(".debate-log-list");
  (data.entries || []).forEach(function (entry) {
    const li = document.createElement("li");
    li.className = "debate-log-entry is-" + entry.kind;
    li.innerHTML = '<span class="debate-log-time"></span><span class="debate-log-text"></span>';
    li.querySelector(".debate-log-time").textContent = formatClock(new Date(entry.time));
    li.querySelector(".debate-log-text").textContent = entry.text;
    entriesList.appendChild(li);
  });

  // Collapsed by default — a delegate opens the ones they care about.
  item.querySelector(".debate-saved-log-head").addEventListener("click", function () {
    entriesList.classList.toggle("is-hidden");
  });

  savedLogList.appendChild(item);
}

function watchSavedLogs() {
  const savedLogsQuery = query(collection(db, "debateLogs"), orderBy("createdAt", "desc"));

  onSnapshot(savedLogsQuery, function (snapshot) {
    savedLogList.innerHTML = "";

    if (snapshot.empty) {
      savedLogList.innerHTML = '<li class="list-empty">No saved meeting logs yet.</li>';
      savedLogCount.textContent = "0 saved";
      return;
    }

    snapshot.forEach(function (docSnap) { renderSavedLog(docSnap.data()); });
    savedLogCount.textContent = snapshot.size + (snapshot.size === 1 ? " saved" : " saved");
  }, function (error) {
    savedLogList.innerHTML = '<li class="list-empty">Could not load saved logs: ' + error.message + '</li>';
  });
}

/* =====================================================================
   SETUP — BUILDING THE PARTICIPANT LIST
   One row per delegation debate-script.js knows how to play. Every
   control here is per delegation on purpose: an accent, a speed, and a
   reading level are choices for that one delegate, not the whole room.
===================================================================== */
function buildParticipantList() {
  DEBATE_PARTICIPANTS.forEach(function (participant) {
    participantSettings[participant.country] = {
      included: true,
      voiceId: "",
      speed: 1,
      simpleEnglish: false
    };

    const row = document.createElement("div");
    row.className = "debate-participant";

    row.innerHTML =
      '<label class="debate-participant-head">' +
        '<input type="checkbox" class="p-checked" checked>' +
        '<span class="flag"></span>' +
        '<span class="p-name"></span>' +
      '</label>' +
      '<div class="debate-participant-options">' +
        '<label>Voice <select class="p-voice" disabled><option value="">Load voices first…</option></select></label>' +
        '<label>Speed ' +
          '<select class="p-speed">' +
            '<option value="1">Normal</option>' +
            '<option value="0.85">Slightly slower</option>' +
            '<option value="0.7">Slow</option>' +
          '</select>' +
        '</label>' +
        '<label class="debate-inline-check"><input type="checkbox" class="p-simple"> Simple English</label>' +
      '</div>';

    // Set as plain text, so nothing here is ever mistaken for page code.
    row.querySelector(".flag").textContent = participant.flag;
    row.querySelector(".p-name").textContent = participant.country;

    const checkedInput = row.querySelector(".p-checked");
    const voiceSelect = row.querySelector(".p-voice");
    const speedSelect = row.querySelector(".p-speed");
    const simpleInput = row.querySelector(".p-simple");

    checkedInput.addEventListener("change", function () {
      participantSettings[participant.country].included = checkedInput.checked;
      updateParticipantCount();
      updateStartButton();
    });

    voiceSelect.addEventListener("change", function () {
      participantSettings[participant.country].voiceId = voiceSelect.value;
      updateStartButton();
    });

    speedSelect.addEventListener("change", function () {
      participantSettings[participant.country].speed = Number(speedSelect.value);
    });

    simpleInput.addEventListener("change", function () {
      participantSettings[participant.country].simpleEnglish = simpleInput.checked;
    });

    // Remembered so loadVoices() can fill every row's dropdown later.
    row.dataset.country = participant.country;
    participantList.appendChild(row);
  });

  updateParticipantCount();
}

/* Builds the "Translation language" dropdown from whichever language
   codes actually appear in debate-script.js, instead of a fixed list
   kept here — so adding a language only ever means editing that one
   file. */
function buildLanguageOptions() {
  const codes = new Set();
  DEBATE_SCRIPT.forEach(function (step) {
    Object.keys(step.translations || {}).forEach(function (code) { codes.add(code); });
  });

  translateLanguageSelect.innerHTML = "";
  Array.from(codes).sort().forEach(function (code) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = LANGUAGE_NAMES[code] || code;
    translateLanguageSelect.appendChild(option);
  });
}

translateToggle.addEventListener("change", function () {
  translateLanguageSelect.disabled = !translateToggle.checked;
});

function updateParticipantCount() {
  const total = DEBATE_PARTICIPANTS.length;
  const included = Object.values(participantSettings).filter(function (s) { return s.included; }).length;
  participantCount.textContent = included + " of " + total + " selected";
}

/* =====================================================================
   LOADING VOICES
   Fetches the real list of voices this ElevenLabs account can use, and
   fills every participant row's dropdown with it. The delegate — not
   this code — decides which voice suits which delegation; nothing here
   guesses an accent from a country automatically.
===================================================================== */
async function loadVoices() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    voiceStatus.className = "record-hint is-error";
    voiceStatus.textContent = "Paste your ElevenLabs API key first.";
    return;
  }

  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);

  voiceStatus.className = "record-hint";
  voiceStatus.textContent = "Loading voices…";
  loadVoicesButton.disabled = true;

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });

    if (!response.ok) {
      throw new Error("ElevenLabs rejected this key (status " + response.status + ").");
    }

    const data = await response.json();
    availableVoices = data.voices || [];

    if (availableVoices.length === 0) {
      throw new Error("This account has no voices available.");
    }

    fillVoiceDropdowns();

    voiceStatus.className = "record-hint";
    voiceStatus.textContent = availableVoices.length + " voices loaded. Pick one for each delegation below.";
  } catch (error) {
    voiceStatus.className = "record-hint is-error";
    voiceStatus.textContent = "Could not load voices: " + error.message;
  }

  loadVoicesButton.disabled = false;
  updateStartButton();
}

function fillVoiceDropdowns() {
  const rows = participantList.querySelectorAll(".debate-participant");

  rows.forEach(function (row, index) {
    const country = row.dataset.country;
    const select = row.querySelector(".p-voice");

    select.innerHTML = "";
    availableVoices.forEach(function (voice) {
      const option = document.createElement("option");
      option.value = voice.voice_id;
      const accent = voice.labels && (voice.labels.accent || voice.labels.description);
      option.textContent = voice.name + (accent ? " — " + accent : "");
      select.appendChild(option);
    });

    select.disabled = false;

    // A different default voice per row, purely so the debate does not
    // default to every delegation sounding identical — fully
    // changeable from the dropdown.
    const defaultVoice = availableVoices[index % availableVoices.length];
    select.value = defaultVoice.voice_id;
    participantSettings[country].voiceId = defaultVoice.voice_id;
  });
}

loadVoicesButton.addEventListener("click", loadVoices);

function updateStartButton() {
  const included = Object.values(participantSettings).filter(function (s) { return s.included; });
  const allHaveVoices = included.every(function (s) { return s.voiceId; });

  // Silent mode needs no voices, so it needs no ElevenLabs key either.
  startButton.disabled = !(included.length > 0 && (silentToggle.checked || allHaveVoices));
}

silentToggle.addEventListener("change", updateStartButton);

/* =====================================================================
   BUILDING THE PLAYLIST
   Turns the full written debate into just the lines that belong to the
   delegations the delegate selected. The Chair always speaks; a
   question is only included if both the delegation asking and the one
   being asked are in the debate, and the same rule applies to whichever
   answer follows that question.
===================================================================== */
function isStepIncluded(step, index) {
  if (step.kind === "chair") return true;

  const speakerIn = participantSettings[step.country] && participantSettings[step.country].included;
  if (!speakerIn) return false;

  if (step.kind === "question") {
    const targetIn = participantSettings[step.targetCountry] && participantSettings[step.targetCountry].included;
    return Boolean(targetIn);
  }

  if (step.kind === "answer") {
    // Only makes sense to include if the question it answers is also
    // in the debate — found by looking back for the nearest question.
    for (let i = index - 1; i >= 0; i--) {
      if (DEBATE_SCRIPT[i].kind === "question") {
        const askerIn = participantSettings[DEBATE_SCRIPT[i].country] && participantSettings[DEBATE_SCRIPT[i].country].included;
        const targetIn = participantSettings[DEBATE_SCRIPT[i].targetCountry] && participantSettings[DEBATE_SCRIPT[i].targetCountry].included;
        return Boolean(askerIn && targetIn);
      }
    }
    return true;
  }

  return true;
}

function buildPlaylist() {
  return DEBATE_SCRIPT.filter(function (step, index) {
    return isStepIncluded(step, index);
  });
}

/* =====================================================================
   STARTING THE MEETING
   Pressing Start Meeting is the moment this screen turns into the debate:
   the setup disappears, the live panels appear, and the meeting is opened
   to other delegates.
===================================================================== */
startButton.addEventListener("click", async function () {
  playlist = buildPlaylist();

  if (playlist.length === 0 || playlist.every(function (s) { return s.kind === "chair"; })) {
    setupError.textContent = "Select at least one delegation to start the debate.";
    return;
  }

  setupError.textContent = "";
  audioCache = {};
  currentIndex = 0;
  isPaused = false;
  silentMode = silentToggle.checked;

  // The meeting room's own controls: countdown, floor voting open, the
  // video tile at rest, and nobody speaking yet.
  startMeetingTimer();
  floorVotingOpen = true;
  applyFloorVotingState();
  audioJoined = false;
  videoOn = false;
  videoAvatar.textContent = (me && me.name ? me.name.trim().charAt(0) : "?").toUpperCase();
  videoName.textContent = me ? me.name + " (" + me.country + ")" : "";
  renderVideoTile();
  setActiveSpeaker(null);

  // A fresh set of AI motions for a fresh debate.
  autoMotions = autoMotionsToggle.checked;
  usedMotionIndexes = [];
  currentAiMotion = null;
  linesSinceMotion = 0;
  pendingResume = null;
  aiMotionHint.textContent = "";
  setPlaybackLocked(false);
  showVotePanel(voteIdle);

  // A fresh meeting log for a fresh debate.
  meetingLog = [];
  activeLogEntry = null;
  logList.innerHTML = "";

  // A fresh resolution vote too, so an old one is never carried over
  // and mistakenly saved with this new debate.
  resolutionTitle = "";
  resolutionText = "";
  resolutionResult = null;
  activeVote = null;
  showResVotePanel(resVoteIdle);

  const names = getVotingParticipants()
    .map(function (p) { return p.flag + " " + p.country; })
    .join(", ");
  logNow("Debate started" + (silentMode ? " in silent mode" : "") + ". Participants: " + names + ".", "system");

  // This is where the screen turns into the debate.
  document.body.classList.add("is-live");
  phaseBadge.textContent = "Live · You are the Chair";

  // Open the meeting to other delegates, then begin.
  await openSharedMeeting();

  renderAgenda();
  playCurrent();
});

/* Creates the shared meeting other delegates can join from the start page,
   and starts listening to who joins and to the ballots they cast. If that
   cannot be done (most often because the Firestore rules in SETUP.md have
   not been published yet), the meeting simply runs on this screen alone —
   with AI delegates voting — and says so. */
async function openSharedMeeting() {
  try {
    meetingId = await createMeeting(me, {
      topic: DEBATE_TOPIC,
      participants: getVotingParticipants().map(function (p) { return p.country; }),
      silent: silentMode,
      subtopic: launchOptions.subtopic,
      scheduledDate: launchOptions.date,
      countries: launchOptions.countries,
      endsAt: meetingEndsAt,
      floorOpen: true
    });

    unwatchMeeting = watchMeeting(meetingId, function (data) { meetingData = data; }, function () {});
    unwatchBallots = watchBallots(meetingId, onRemoteBallot, function () {});
  } catch (error) {
    meetingId = null;
    phaseBadge.textContent = "Live · not shared";
    logNow("This meeting could not be shared with other students (" + error.message +
           "), so it runs on this screen only.", "system");
  }
}

function renderAgenda() {
  agendaList.innerHTML = "";
  playlist.forEach(function (step) {
    const item = document.createElement("li");
    item.className = "debate-agenda-item";
    item.textContent = (step.country ? step.flag + " " : step.flag + " ") + step.speaker + " — " + step.label;
    agendaList.appendChild(item);
  });
  updateAgendaHighlight();
}

function updateAgendaHighlight() {
  const items = agendaList.querySelectorAll(".debate-agenda-item");
  items.forEach(function (item, index) {
    item.classList.toggle("is-current", index === currentIndex);
    item.classList.toggle("is-done", index < currentIndex);
  });
  agendaProgress.textContent = (currentIndex + 1) + " of " + playlist.length;
}

/* =====================================================================
   PLAYING ONE LINE
   Speaks the current playlist step: shows who is speaking and their
   caption, fetches (or reuses) the ElevenLabs audio for that line, and
   plays it at whichever speed and reading level that delegation was
   set to.
===================================================================== */
function settingsFor(step) {
  if (step.country && participantSettings[step.country]) {
    return participantSettings[step.country];
  }
  // The Chair has no setup-screen row — a plain default so the Chair
  // can still be heard.
  return { voiceId: availableVoices[0] ? availableVoices[0].voice_id : "", speed: 1, simpleEnglish: false };
}

async function playCurrent() {
  // A different line is starting, so the previous one (if any) is over
  // — write down how long it actually held the floor before moving on.
  finalizeActiveLogEntry();

  // And in silent mode, cancel the previous line's on-screen timer so it
  // cannot move the debate along a second time.
  clearTimeout(silentTimerId);

  // Whatever was waiting to carry on after a motion is now moot, and one
  // more line has gone by since the last motion was raised.
  pendingResume = null;
  linesSinceMotion++;
  setActiveSpeaker(null);

  const step = playlist[currentIndex];
  const settings = settingsFor(step);

  stageAvatar.textContent = step.flag;
  stageAvatar.classList.toggle("is-ai", false);
  stageCountry.textContent = step.speaker;
  stageLabel.textContent = step.label;

  const captionText = settings.simpleEnglish ? step.simple : step.formal;
  stageCaption.textContent = captionText;
  stageCaption.classList.toggle("is-clickable", translateToggle.checked);

  stageTranslation.classList.add("is-hidden");
  const chosenLanguage = translateLanguageSelect.value;
  stageTranslation.textContent =
    (step.translations && step.translations[chosenLanguage]) ||
    "No translation written for this line yet.";

  // With no voice, the caption is the only way to follow the debate, so
  // silent mode always shows it whatever the captions option says.
  stageCaption.classList.toggle("is-hidden", !(captionsToggle.checked || silentMode));

  updateAgendaHighlight();

  if (silentMode) {
    startSilentReading(step, settings, captionText);
    return;
  }

  stageStatus.className = "record-hint";
  stageStatus.textContent = "Preparing audio…";
  playPauseButton.disabled = true;

  try {
    const audioUrl = await getAudioForStep(currentIndex, step, settings, captionText);
    debateAudio.src = audioUrl;
    debateAudio.playbackRate = settings.speed;
    await debateAudio.play();
    isPaused = false;
    playPauseButton.textContent = "Pause";
    stageStatus.textContent = "Speaking…";
    setActiveSpeaker(step);

    // Starts this line's clock, so its duration can be logged once the
    // debate moves on to whatever comes next.
    activeLogEntry = { index: currentIndex, step: step, startedAt: Date.now(), startClock: new Date() };
  } catch (error) {
    stageStatus.className = "record-hint is-error";
    stageStatus.textContent = "Could not play this line: " + error.message;
  }

  playPauseButton.disabled = false;
}

/* Fetches ElevenLabs audio for one line, keeping it in memory so moving
   back and forth in the debate never pays to generate the same line
   twice. */
async function getAudioForStep(index, step, settings, captionText) {
  if (audioCache[index]) return audioCache[index];

  const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(settings.voiceId),
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: captionText,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    }
  );

  if (!response.ok) {
    throw new Error("ElevenLabs error (status " + response.status + ")");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  audioCache[index] = url;
  return url;
}

/* Moves on to the next line once the current one is over — unless the
   delegate paused on purpose, in which case staying put is the correct
   behaviour. Used both when a spoken line finishes and when a silent
   line's reading time runs out. */
function advanceAfterLine() {
  if (isPaused) return;
  if (currentIndex < playlist.length - 1) {
    currentIndex++;

    // Between two lines is where a motion would naturally be raised. If
    // an AI delegate raises one, the debate waits here for the Chair and
    // carries on with this next line afterwards.
    if (maybeRaiseAiMotionBetweenLines()) return;

    playCurrent();
  } else {
    finalizeActiveLogEntry();
    logNow("Debate complete — adjourned.", "system");
    setActiveSpeaker(null);
    stageStatus.className = "record-hint";
    stageStatus.textContent = "Debate complete. Press “End meeting” (or Wrap Up Meeting) to save the log and return home.";
    playPauseButton.textContent = "Play";
  }
}

debateAudio.addEventListener("ended", advanceAfterLine);

/* =====================================================================
   SILENT MODE
   Shows a line as a caption for about as long as it would take to say
   aloud — its word count at a normal speaking pace, stretched out for a
   delegation set to a slower speed, never under a few seconds — and
   then moves on, exactly as if a voice had just finished speaking it.
===================================================================== */
function scheduleSilentAdvance(ms) {
  clearTimeout(silentTimerId);
  silentRemainingMs = ms;
  silentStartedAt = Date.now();
  silentTimerId = setTimeout(advanceAfterLine, ms);
}

function startSilentReading(step, settings, captionText) {
  const words = captionText.trim().split(/\s+/).length;
  const seconds = Math.max(SILENT_MIN_SECONDS, words / SILENT_WORDS_PER_SECOND) / settings.speed;

  isPaused = false;
  playPauseButton.disabled = false;
  playPauseButton.textContent = "Pause";
  stageStatus.className = "record-hint";
  stageStatus.textContent = "Silent mode — reading time about " + Math.round(seconds) + "s.";

  setActiveSpeaker(step);

  // The meeting log's clock starts now, same as when a voice starts.
  activeLogEntry = { index: currentIndex, step: step, startedAt: Date.now(), startClock: new Date() };

  scheduleSilentAdvance(seconds * 1000);
}

/* Stops whatever is playing — the voice, or silent mode's timer — while
   keeping its place. Used when the Chair calls a vote, so no line moves
   on or keeps talking while the committee votes. */
function pauseForVote() {
  debateAudio.pause();
  setActiveSpeaker(null);

  if (silentMode && !isPaused) {
    isPaused = true;
    clearTimeout(silentTimerId);
    silentRemainingMs -= Date.now() - silentStartedAt;
    playPauseButton.textContent = "Play";
    stageStatus.textContent = "Paused for a vote.";
  }
}

/* =====================================================================
   PLAYBACK CONTROLS
===================================================================== */
playPauseButton.addEventListener("click", function () {
  if (silentMode) {
    if (isPaused) {
      isPaused = false;
      playPauseButton.textContent = "Pause";
      stageStatus.textContent = "Silent mode.";
      setActiveSpeaker(playlist[currentIndex]);
      scheduleSilentAdvance(Math.max(silentRemainingMs, 500));
    } else {
      isPaused = true;
      clearTimeout(silentTimerId);
      silentRemainingMs -= Date.now() - silentStartedAt;
      playPauseButton.textContent = "Play";
      stageStatus.textContent = "Paused.";
      setActiveSpeaker(null);
    }
    return;
  }

  if (debateAudio.paused) {
    debateAudio.play();
    isPaused = false;
    playPauseButton.textContent = "Pause";
    stageStatus.textContent = "Speaking…";
    setActiveSpeaker(playlist[currentIndex]);
  } else {
    debateAudio.pause();
    isPaused = true;
    playPauseButton.textContent = "Play";
    stageStatus.textContent = "Paused.";
    setActiveSpeaker(null);
  }
});

prevButton.addEventListener("click", function () {
  if (currentIndex <= 0) return;
  currentIndex--;
  playCurrent();
});

nextButton.addEventListener("click", function () {
  if (currentIndex >= playlist.length - 1) return;
  currentIndex++;
  playCurrent();
});

// Clicking the caption reveals the translation in whichever language
// was picked on the setup screen, only when that option was turned on
// before starting the debate.
stageCaption.addEventListener("click", function () {
  if (!translateToggle.checked) return;
  stageTranslation.classList.toggle("is-hidden");
});

endButton.addEventListener("click", function () {
  finalizeActiveLogEntry();
  logNow("Meeting ended by the Chair.", "system");
  finishMeetingAndGoHome();
});

/* =====================================================================
   VOTING
   One engine runs both kinds of vote: a procedural vote (Yes or No, no
   abstaining) and the final resolution vote (Yes, No, or Abstain). A vote
   has one row for every delegation that votes, and EACH DELEGATION VOTES
   FOR ITSELF — the Chair never chooses anyone else's vote:

     - A delegation a student is playing (the Chair, or anyone who joined
       the meeting) is voted by that student, from their own screen.
     - Any other voting delegation is an AI delegate, and votes by itself
       after a short pause, according to its country's researched position
       (see aiVote). Its reason is shown next to its vote.

   Who votes: every delegation speaking in this debate, every student in
   the room (for their own country, whichever it is), and every seat the AI
   holds. The Chair closes a vote early if they like, but whoever has not
   voted by then is simply not counted — nothing is filled in for them.
===================================================================== */

// How long a vote stays open (seconds). Longer when students other than
// the Chair are voting too, since they need time to see it and answer.
const VOTE_SECONDS = { procedural: 15, resolution: 20 };
const VOTE_SECONDS_WITH_STUDENTS = 30;

/* The flag for any country that can vote — roster countries and the debate's
   own delegations (Singapore is in the debate but has no roster seat). */
function flagForCountry(country) {
  const seat = COUNTRIES.find(function (c) { return c.country === country; }) ||
               DEBATE_PARTICIPANTS.find(function (p) { return p.country === country; });
  return seat ? seat.flag : "🏳️";
}

/* The students in the meeting right now: from the shared meeting if there is
   one, otherwise just the Chair. */
function currentMembers() {
  if (meetingData && meetingData.members) {
    return Object.keys(meetingData.members).map(function (uid) {
      const member = meetingData.members[uid];
      return { uid: uid, name: member.name, country: member.country };
    });
  }
  return me ? [{ uid: me.uid, name: me.name, country: me.country }] : [];
}

/* The delegations selected on the setup screen, i.e. the ones that speak. */
function getVotingParticipants() {
  return DEBATE_PARTICIPANTS.filter(function (p) {
    return participantSettings[p.country] && participantSettings[p.country].included;
  });
}

/* Everyone who votes, each exactly once, as { country, flag, kind, uid,
   name }. kind is "human" when a student is playing that country, and
   "ai" otherwise. */
function getVoters() {
  const roster = getRosterState();
  const members = currentMembers();

  const wanted = new Set(
    getVotingParticipants().map(function (p) { return p.country; })
      .concat(roster.aiCountries)
      .concat(launchOptions.aiCountries)
      .concat(members.map(function (m) { return m.country; }))
  );

  // Roster order first, then anything that has no roster seat.
  const ordered = [];
  COUNTRIES.forEach(function (c) { if (wanted.has(c.country)) ordered.push(c.country); });
  wanted.forEach(function (country) { if (ordered.indexOf(country) === -1) ordered.push(country); });

  return ordered.map(function (country) {
    const student = members.find(function (m) { return m.country === country; });
    return {
      country: country,
      flag: flagForCountry(country),
      kind: student ? "human" : "ai",
      uid: student ? student.uid : null,
      name: student ? student.name : "AI Delegate"
    };
  });
}

/* A small repeatable number from some text, so an AI delegate's "routine"
   vote on the same motion is always the same. */
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

/* How an AI delegate votes. No AI service is called. It looks for the
   phrases in what is being voted on that its country's research says it
   supports, or that cross its red lines (see VOTING_PROFILES in
   debate-script.js), and gives the phrases as its reason.
     Resolution: more support than opposition -> Yes; any red line crossed
                 (they weigh double) -> No; nothing relevant -> Abstain.
     Procedural: a red line crossed -> No; otherwise a routine vote, mostly
                 Yes, since a country's research says nothing about
                 procedure. */
function aiVote(country, vote) {
  const researched = Boolean(VOTING_PROFILES[country]);
  const profile = VOTING_PROFILES[country] || DEFAULT_VOTING_PROFILE;
  const basis = researched ? "its researched position" : "its general stance (this country has no research yet)";
  const text = (vote.title + " " + vote.text).toLowerCase();

  function found(phrases) {
    return phrases.filter(function (phrase) { return text.indexOf(phrase) !== -1; });
  }
  function quote(phrases) {
    return phrases.slice(0, 3).map(function (p) { return "“" + p.trim() + "”"; }).join(", ");
  }

  const supports = found(profile.supports);
  const opposes = found(profile.opposes);
  const score = supports.length - 2 * opposes.length;

  if (vote.kind === "resolution") {
    if (score > 0) return { choice: "yes", reason: "Fits " + basis + " — " + quote(supports) + "." };
    if (score < 0) return { choice: "no", reason: "Crosses a red line in " + basis + " — " + quote(opposes) + "." };
    return { choice: "abstain", reason: "Nothing in the text touches " + basis + "." };
  }

  if (opposes.length > 0) {
    return { choice: "no", reason: "The motion conflicts with " + basis + " — " + quote(opposes) + "." };
  }
  const routineYes = hashText(country + vote.title) % 100 < 75;
  return {
    choice: routineYes ? "yes" : "no",
    reason: "A routine procedural vote — " + (researched ? "its research" : "it") + " has no position on procedure."
  };
}

function labelForChoice(choice) {
  return choice === "yes" ? "Yes" : choice === "no" ? "No" : "Abstain";
}

/* The panels and elements that belong to each kind of vote. */
function voteView(kind) {
  if (kind === "resolution") {
    return {
      show: showResVotePanel, idle: resVoteIdle, open: resVoteOpenPanel, results: resVoteResultsPanel,
      list: resVoteBallotList, timer: resVoteTimer, chart: resVoteChart, verdict: resVoteVerdict,
      resultTitle: resVoteResultTitle, liveTally: resLiveTally, count: resVoteBallotCount
    };
  }
  return {
    show: showVotePanel, idle: voteIdle, open: voteOpenPanel, results: voteResultsPanel,
    list: voteBallotList, timer: voteTimer, chart: voteChart, verdict: voteVerdict,
    resultTitle: voteResultMotion, liveTally: voteLiveTally, count: voteBallotCount
  };
}

function showVotePanel(panel) {
  [voteIdle, aiMotionPanel, voteMotionForm, voteOpenPanel, voteResultsPanel].forEach(function (el) {
    el.classList.toggle("is-hidden", el !== panel);
  });
}

function showResVotePanel(panel) {
  [resVoteIdle, resVoteForm, resVoteOpenPanel, resVoteResultsPanel].forEach(function (el) {
    el.classList.toggle("is-hidden", el !== panel);
  });
}

function voteIsOpen() {
  return Boolean(activeVote && activeVote.status === "open");
}

/* ---------------------------------------------------------------------
   OPENING A VOTE (the Chair)
--------------------------------------------------------------------- */

// Calling a vote pauses any speech in progress, so no delegate is
// still talking while the committee is meant to be voting.
callVoteButton.addEventListener("click", function () {
  if (voteIsOpen()) {
    stageStatus.textContent = "A vote is already open — wait for it to close.";
    return;
  }
  pauseForVote();
  voteMotionInput.value = "";
  voteOptionsInput.value = "Yes\nNo\nAbstain";
  voteFormError.textContent = "";
  showVotePanel(voteMotionForm);
});

cancelVoteButton.addEventListener("click", function () {
  showVotePanel(voteIdle);
});

/* "Create": checks the question and the options typed one per line, then
   opens the vote. Yes and No are needed; Abstain is optional (leaving the
   line out gives a vote with no abstentions). Anything else is refused,
   because the voting below only knows those three answers. */
openVoteButton.addEventListener("click", function () {
  const question = voteMotionInput.value.trim();
  if (!question) {
    voteFormError.textContent = "Write the motion or question first.";
    return;
  }

  const lines = voteOptionsInput.value.split("\n")
    .map(function (line) { return line.trim().toLowerCase(); })
    .filter(Boolean);
  const unsupported = lines.filter(function (line) { return ["yes", "no", "abstain"].indexOf(line) === -1; });

  if (unsupported.length > 0) {
    voteFormError.textContent = "Only Yes, No and Abstain are supported options here. Remove: " + unsupported.join(", ") + ".";
    return;
  }
  if (lines.indexOf("yes") === -1 || lines.indexOf("no") === -1) {
    voteFormError.textContent = "A vote needs at least a Yes and a No option.";
    return;
  }

  voteFormError.textContent = "";
  openProceduralVote(question, null, lines.indexOf("abstain") !== -1);
});

/* Opens a procedural vote on a motion. raisedBy is the AI delegate that
   raised it (so the vote can say whose motion this is), or null when the
   Chair wrote the motion. */
function openProceduralVote(motionText, raisedBy, allowAbstain) {
  startVote({
    kind: "procedural", title: motionText || "Procedural motion", text: "",
    raisedBy: raisedBy, allowAbstain: Boolean(allowAbstain)
  });
}

writeResolutionButton.addEventListener("click", function () {
  if (voteIsOpen()) {
    stageStatus.textContent = "A vote is already open — wait for it to close.";
    return;
  }
  pauseForVote();
  resolutionTitleInput.value = resolutionTitle;
  resolutionTextInput.value = resolutionText;
  resolutionSubmittedInput.value = resolutionSubmittedBy || (me ? me.country : "");
  resolutionCosponsorsInput.value = resolutionCosponsors;
  resFormHint.textContent = "";
  resSummaryCount.textContent = "The discussion feed currently has " + (postCountText() || "no posts") + ".";
  showResVotePanel(resVoteForm);
});

cancelResVoteButton.addEventListener("click", function () {
  showResVotePanel(resVoteIdle);
});

/* The words under the Global Discussion Feed's title ("3 posts"), used to
   say how much discussion there has been. */
function postCountText() {
  const counter = document.getElementById("postCount");
  return counter ? counter.textContent.trim() : "";
}

/* "Save resolution" keeps what the Chair has typed, without opening a vote,
   so it is still there if the form is closed and opened again. */
resSaveButton.addEventListener("click", function () {
  resolutionTitle = resolutionTitleInput.value.trim();
  resolutionText = resolutionTextInput.value.trim();
  resolutionSubmittedBy = resolutionSubmittedInput.value.trim();
  resolutionCosponsors = resolutionCosponsorsInput.value.trim();
  resFormHint.className = "record-hint";
  resFormHint.textContent = "Resolution saved. Press Open Vote when it is ready.";
});

/* The two buttons below only stand where an AI feature would go. No AI
   service is connected (that would cost money), so they say so rather than
   pretend: the resolution and any summary are written by people. */
resAiDraftButton.addEventListener("click", function () {
  resFormHint.className = "record-hint";
  resFormHint.textContent = "AI drafting is not connected in this prototype — please write the resolution by hand.";
});
resGenerateSummaryButton.addEventListener("click", function () {
  resFormHint.className = "record-hint";
  resFormHint.textContent = "AI summaries are not connected in this prototype — nothing was generated.";
});

openResVoteButton.addEventListener("click", function () {
  if (!resolutionTextInput.value.trim()) {
    resolutionTextInput.focus();
    return; // A vote needs something written down to vote on.
  }

  startVote({
    kind: "resolution",
    title: resolutionTitleInput.value.trim() || "Draft Resolution",
    text: resolutionTextInput.value.trim(),
    submittedBy: resolutionSubmittedInput.value.trim(),
    coSponsors: resolutionCosponsorsInput.value.trim(),
    raisedBy: null
  });
});

/* Opens the vote: works out who votes, shows a row for each, starts the
   clock, lines up the AI delegates' ballots, and tells the shared meeting
   so delegates who joined can vote too. */
function startVote(options) {
  if (voteIsOpen()) return;

  const voters = getVoters();
  if (voters.length === 0) return;

  const seconds = voteSeconds(options.kind, voters);

  const vote = {
    id: "v" + Date.now().toString(36),
    kind: options.kind,
    title: options.title,
    text: options.text,
    allowAbstain: options.allowAbstain !== undefined ? options.allowAbstain : options.kind === "resolution",
    submittedBy: options.submittedBy || "",
    coSponsors: options.coSponsors || "",
    closesAt: Date.now() + seconds * 1000,
    raisedBy: options.raisedBy ? { flag: options.raisedBy.flag, country: options.raisedBy.country } : null,
    voters: voters,
    ballots: {},
    status: "open",
    timerId: null,
    aiTimers: [],
    tally: null,
    results: null
  };
  activeVote = vote;

  const view = voteView(vote.kind);

  if (vote.kind === "resolution") {
    resolutionTitle = vote.title;
    resolutionText = vote.text;
    resolutionSubmittedBy = vote.submittedBy;
    resolutionCosponsors = vote.coSponsors;
    resVoteDisplayTitle.textContent = vote.title;
    resVoteDisplayText.textContent = vote.text;
    resVoteDisplayBy.textContent = byLine(vote);
    logNow("🔔 Chair opened a vote on \"" + vote.title + "\".", "vote");
  } else {
    voteMotionDisplay.textContent = vote.title;
    voteMotionOrigin.textContent = vote.raisedBy
      ? "Raised by " + vote.raisedBy.flag + " " + vote.raisedBy.country + " (AI delegate)."
      : "";
    logNow(
      vote.raisedBy
        ? "🔔 Chair put the motion raised by " + vote.raisedBy.flag + " " + vote.raisedBy.country +
          " (AI delegate) to a procedural vote: “" + vote.title + "”"
        : "🔔 Chair called a procedural vote: “" + vote.title + "”",
      "vote"
    );
  }

  view.list.innerHTML = "";
  voters.forEach(function (voter) { view.list.appendChild(buildBallotRow(vote, voter)); });
  renderLiveTally(vote);
  renderCastNotice(vote);

  tickVoteClock();
  vote.timerId = setInterval(tickVoteClock, 1000);
  scheduleAiBallots(vote, seconds);

  view.show(view.open);
  publishMeeting({ vote: publicVote(vote) });
}

/* How long a vote stays open: longer when other students have to vote too. */
function voteSeconds(kind, voters) {
  const otherStudents = voters.filter(function (v) { return v.kind === "human" && v.uid !== me.uid; }).length;
  return otherStudents > 0 ? VOTE_SECONDS_WITH_STUDENTS : VOTE_SECONDS[kind];
}

/* "Submitted by: …  ·  Co-sponsors: …", the line under a resolution. */
function byLine(vote) {
  return "Submitted by: " + (vote.submittedBy || "the Chair") + "  ·  Co-sponsors: " + (vote.coSponsors || "none");
}

/* A ballot as stored on the Chair's screen is { choice, by, reason }; the
   copy sent to joined delegates is just the choice. This returns the
   choice either way. */
function choiceOf(ballot) {
  return ballot && typeof ballot === "object" ? ballot.choice : ballot;
}

/* Draws "each option with its votes so far" — a count, a percentage of the
   ballots cast, and a bar — for the vote that is open. Called every time a
   ballot arrives. Also keeps the Voting outcome screen up to date if it is
   open. */
function renderLiveTally(vote) {
  const view = voteView(vote.kind);
  const counts = { yes: 0, no: 0, abstain: 0 };
  Object.keys(vote.ballots || {}).forEach(function (country) {
    const choice = choiceOf(vote.ballots[country]);
    if (counts[choice] !== undefined) counts[choice]++;
  });
  const cast = counts.yes + counts.no + counts.abstain;

  view.liveTally.innerHTML = "";
  [["yes", "Yes"], ["no", "No"], ["abstain", "Abstain"]].forEach(function (option) {
    if (option[0] === "abstain" && !vote.allowAbstain) return;
    const percent = cast > 0 ? counts[option[0]] / cast * 100 : 0;

    const line = document.createElement("div");
    line.className = "live-tally-row";

    const head = document.createElement("div");
    head.className = "live-tally-head";
    const label = document.createElement("span");
    label.textContent = option[1];
    const number = document.createElement("span");
    number.textContent = counts[option[0]] + " (" + Math.round(percent) + "%)";
    head.append(label, number);

    const track = document.createElement("div");
    track.className = "live-tally-track";
    const fill = document.createElement("div");
    fill.className = "live-tally-fill is-" + option[0];
    fill.style.width = percent + "%";
    track.appendChild(fill);

    line.append(head, track);
    view.liveTally.appendChild(line);
  });

  view.count.textContent = cast + (cast === 1 ? " ballot" : " ballots") + " cast of " + vote.voters.length;

  if (vote.kind === "resolution") {
    shownResolution = vote;
    refreshResultsView();
  }
}

/* The "Cast your vote" notice at the top of a resolution vote. A delegate
   whose own country is in the vote votes with the buttons on their
   delegation's row; anyone else — the Chair when their country is not
   voting, or a student who joined late — sees the same three buttons
   switched off, with the reason. Nobody can ever vote for another
   delegation. */
function renderCastNotice(vote) {
  if (vote.kind !== "resolution") return;
  resCastNotice.innerHTML = "";

  const inVote = vote.voters.some(function (v) { return v.uid === me.uid; });

  const label = document.createElement("p");
  label.className = "field-label";
  label.textContent = "Cast your vote";
  resCastNotice.appendChild(label);

  if (!inVote) {
    const buttons = document.createElement("div");
    buttons.className = "cast-buttons";
    ["Yes (For)", "No (Against)", "Abstain"].forEach(function (text) {
      const button = document.createElement("button");
      button.className = "btn btn-quiet";
      button.type = "button";
      button.disabled = true;
      button.textContent = text;
      buttons.appendChild(button);
    });
    resCastNotice.appendChild(buttons);
  }

  const note = document.createElement("p");
  note.className = "debate-note";
  note.textContent = inVote
    ? "Vote with the buttons on your own delegation's row below. You cannot vote for any other delegation."
    : "Your delegation is not voting here, and nobody can vote for another delegation — AI delegates and students vote for themselves.";
  resCastNotice.appendChild(note);
}

function tickVoteClock() {
  const vote = activeVote;
  if (!vote || vote.status !== "open") return;

  const left = Math.ceil((vote.closesAt - Date.now()) / 1000);
  voteView(vote.kind).timer.textContent = left > 0 ? "Voting closes in " + left + "s" : "Closing the vote…";
  if (left <= 0) closeActiveVote();
}

/* Each AI delegate "deliberates" for a moment, then casts its own ballot,
   so the votes come in one by one rather than all at once. */
function scheduleAiBallots(vote, seconds) {
  const latest = Math.max(2500, Math.min(8000, seconds * 1000 - 4000));

  vote.voters.filter(function (v) { return v.kind === "ai" && !vote.ballots[v.country]; }).forEach(function (voter) {
    const delay = 1200 + Math.random() * (latest - 1200);
    vote.aiTimers.push(setTimeout(function () {
      const decision = aiVote(voter.country, vote);
      recordBallot(vote, voter.country, decision.choice, "ai", decision.reason);
    }, delay));
  });
}

/* ---------------------------------------------------------------------
   BALLOTS
--------------------------------------------------------------------- */

/* Builds one delegation's row in an open vote. Only the row of the student
   looking at this screen has Yes/No(/Abstain) buttons; every other row just
   shows who the voter is and what they have done. */
function buildBallotRow(vote, voter) {
  const mine = voter.kind === "human" && voter.uid === me.uid;

  const row = document.createElement("div");
  row.className = "debate-ballot-row";
  row.dataset.country = voter.country;

  row.innerHTML =
    '<span class="flag"></span>' +
    '<span class="ballot-name"></span>' +
    '<span class="tag' + (voter.kind === "ai" ? ' is-ai' : '') + '"></span>' +
    (mine
      ? '<button class="ballot-vote-btn is-yes" type="button">Yes</button>' +
        '<button class="ballot-vote-btn is-no" type="button">No</button>' +
        (vote.allowAbstain ? '<button class="ballot-vote-btn is-abstain" type="button">Abstain</button>' : '')
      : '') +
    '<span class="ballot-status"></span>' +
    '<span class="ballot-reason"></span>';

  row.querySelector(".flag").textContent = voter.flag;
  row.querySelector(".ballot-name").textContent = voter.country;
  row.querySelector(".tag").textContent = voter.kind === "ai" ? "AI Delegate" : "Human Delegate";
  row.querySelector(".ballot-status").textContent =
    mine ? "Your vote" :
    voter.kind === "ai" ? "AI delegate deliberating…" :
    "Waiting for " + voter.name + "…";

  if (mine) {
    ["yes", "no", "abstain"].forEach(function (choice) {
      const button = row.querySelector(".is-" + choice);
      if (button) button.addEventListener("click", function () { castMyBallot(vote, voter, choice); });
    });
  }

  return row;
}

/* Shows a vote having been cast on one row. */
function applyChoiceToRow(row, choice, reason, prefix) {
  row.querySelector(".ballot-status").textContent = prefix + labelForChoice(choice);
  row.querySelector(".ballot-reason").textContent = reason || "";
  row.querySelectorAll(".ballot-vote-btn").forEach(function (button) {
    button.disabled = true;
    button.classList.toggle("is-selected", button.classList.contains("is-" + choice));
  });
}

function rowForCountry(kind, country) {
  const rows = voteView(kind).list.children;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].dataset.country === country) return rows[i];
  }
  return null;
}

/* The student looking at this screen votes for their own country. On the
   Chair's screen that is recorded directly; on a joined delegate's screen it
   is sent to the shared meeting as that delegate's own ballot. */
function castMyBallot(vote, voter, choice) {
  if (!isMemberMode) {
    recordBallot(vote, voter.country, choice, "human", "");
    return;
  }

  castBallot(meetingId, vote.id, voter.country, choice, me)
    .then(function () {
      const row = rowForCountry(vote.kind, voter.country);
      if (row) applyChoiceToRow(row, choice, "", "You voted: ");
    })
    .catch(function (error) {
      stageStatus.className = "record-hint is-error";
      stageStatus.textContent = "Your vote could not be sent: " + error.message;
    });
}

/* A ballot has come in. Checks that it is allowed (the vote is open, the
   delegation votes in it and has not voted yet, and the choice is one this
   vote allows), writes it into the row and the meeting log — saying whether
   it came from an AI delegate or a student — and closes the vote once
   everyone has voted. */
function recordBallot(vote, country, choice, by, reason) {
  if (vote !== activeVote || vote.status !== "open") return false;

  const voter = vote.voters.find(function (v) { return v.country === country; });
  if (!voter || vote.ballots[country]) return false;
  if (choice !== "yes" && choice !== "no" && !(choice === "abstain" && vote.allowAbstain)) return false;

  vote.ballots[country] = { choice: choice, by: by, reason: reason || "" };

  const row = rowForCountry(vote.kind, country);
  if (row) applyChoiceToRow(row, choice, reason, "Voted: ");
  renderLiveTally(vote);

  logNow(
    "🗳 " + voter.flag + " " + country + " (" + (by === "ai" ? "AI delegate" : "human delegate " + voter.name) +
    ") voted " + labelForChoice(choice) + (reason ? " — " + reason : ""),
    "vote"
  );

  if (vote.voters.every(function (v) { return vote.ballots[v.country]; })) closeActiveVote();
  return true;
}

/* A ballot arrived from the shared meeting. Only a student who is really
   the voter for that country, in the vote that is open, is counted. */
function onRemoteBallot(ballot) {
  const vote = activeVote;
  if (!vote || ballot.voteId !== vote.id) return;

  const voter = vote.voters.find(function (v) { return v.country === ballot.country; });
  if (!voter || voter.kind !== "human" || voter.uid !== ballot.uid) return;

  recordBallot(vote, ballot.country, ballot.choice, "human", "");
}

/* ---------------------------------------------------------------------
   CLOSING A VOTE AND SHOWING THE RESULT
--------------------------------------------------------------------- */

closeVoteButton.addEventListener("click", closeActiveVote);
closeResVoteButton.addEventListener("click", closeActiveVote);

/* Closes the open vote — the clock ran out, the Chair closed it, floor
   voting was closed, or everyone has voted — counts it, and shows the
   result. A simple majority of Yes against No decides it (a tie fails);
   abstentions are shown but count for neither side, and a delegation that
   never voted is left out rather than assumed to be anything. */
function closeActiveVote() {
  const vote = activeVote;
  if (!vote || vote.status !== "open") return;

  vote.status = "closed";
  clearInterval(vote.timerId);
  vote.aiTimers.forEach(clearTimeout);

  vote.results = vote.voters.map(function (voter) {
    const ballot = vote.ballots[voter.country];
    return {
      country: voter.country,
      flag: voter.flag,
      kind: voter.kind,
      name: voter.name,
      uid: voter.uid,
      choice: ballot ? ballot.choice : null,
      reason: ballot ? ballot.reason : ""
    };
  });

  const count = function (choice) {
    return vote.results.filter(function (r) { return r.choice === choice; }).length;
  };
  const yes = count("yes");
  const no = count("no");
  const abstain = count("abstain");
  const notVoted = vote.results.filter(function (r) { return !r.choice; }).length;
  vote.tally = { yes: yes, no: no, abstain: abstain, notVoted: notVoted, passed: yes > no };

  renderVoteResult(vote);

  const isResolution = vote.kind === "resolution";
  logNow(
    "Vote closed on " + (isResolution ? "\"" + vote.title + "\"" : "“" + vote.title + "”") + " — " +
    (isResolution ? (vote.tally.passed ? "ADOPTED" : "FAILS TO PASS") : (vote.tally.passed ? "PASSES" : "FAILS")) +
    " (" + yes + "-" + no + (vote.allowAbstain ? "-" + abstain : "") + ")" +
    (notVoted > 0 ? ", " + notVoted + " did not vote in time" : "") + ".",
    "vote"
  );

  if (isResolution) {
    resolutionResult = {
      yesCount: yes,
      noCount: no,
      abstainCount: abstain,
      passed: vote.tally.passed,
      ballots: vote.results.map(function (r) {
        return {
          country: r.country,
          choice: r.choice || "none",
          by: r.kind === "ai" ? "AI delegate" : "student",
          name: r.kind === "ai" ? "AI Delegate" : r.name,
          uid: r.uid || null
        };
      })
    };
  }

  voteView(vote.kind).show(voteView(vote.kind).results);
  publishMeeting({ vote: publicVote(vote) });
}

/* Draws a closed vote's result: a bar chart, who voted how (and whether
   each was an AI delegate or a student, with the AI's reason), and the
   verdict. Works from the vote's own data, so the Chair's screen and a
   joined delegate's screen show exactly the same thing. */
function renderVoteResult(vote) {
  const view = voteView(vote.kind);
  const t = vote.tally;
  const isResolution = vote.kind === "resolution";
  const max = Math.max(t.yes, t.no, t.abstain, 1);

  function bar(label, count, kind) {
    return '<div class="vote-bar-row">' +
      '<span class="vote-bar-label">' + label + '</span>' +
      '<div class="vote-bar-track"><div class="vote-bar-fill ' + kind + '" style="width:' +
        (count / max * 100) + '%"></div></div>' +
      '<span class="vote-bar-count">' + count + '</span>' +
    '</div>';
  }

  view.resultTitle.textContent = vote.title;
  view.chart.innerHTML =
    bar("Yes", t.yes, "is-yes") +
    bar("No", t.no, "is-no") +
    (vote.allowAbstain ? bar("Abst.", t.abstain, "is-abstain") : "");

  const breakdown = document.createElement("div");
  breakdown.className = "vote-breakdown";
  vote.results.forEach(function (r) {
    const line = document.createElement("div");
    line.className = "vote-breakdown-row";

    const who = document.createElement("strong");
    who.textContent = r.flag + " " + r.country + " — " + (r.choice ? labelForChoice(r.choice) : "did not vote");

    const detail = document.createElement("span");
    detail.textContent = (r.kind === "ai" ? "AI delegate" : "human delegate " + r.name) + (r.reason ? " · " + r.reason : "");

    line.append(who, detail);
    breakdown.appendChild(line);
  });
  view.chart.appendChild(breakdown);

  view.verdict.textContent =
    (isResolution ? (t.passed ? "Resolution ADOPTED" : "Resolution FAILS to pass")
                  : (t.passed ? "Motion PASSES" : "Motion FAILS")) +
    " — " + t.yes + " in favor, " + t.no + " opposed" +
    (vote.allowAbstain ? ", " + t.abstain + " abstaining" : "") +
    (t.notVoted > 0 ? ", " + t.notVoted + " did not vote in time" : "") + ".";
  view.verdict.style.color = t.passed ? "#1f8a3b" : "var(--danger)";

  if (isResolution) {
    shownResolution = vote;
    refreshResultsView();
  }
}

/* What the shared meeting is told about a vote — everything a delegate
   who joined needs to see it, vote in it, and read its result. */
function publicVote(vote) {
  return {
    id: vote.id,
    kind: vote.kind,
    title: vote.title,
    text: vote.text,
    allowAbstain: vote.allowAbstain,
    submittedBy: vote.submittedBy,
    coSponsors: vote.coSponsors,
    // Just the choices so far (no reasons), so a joined delegate sees the
    // same live tally, and a ballot they already cast is not offered again.
    ballots: Object.keys(vote.ballots).reduce(function (map, country) {
      map[country] = vote.ballots[country].choice;
      return map;
    }, {}),
    closesAt: vote.closesAt,
    status: vote.status,
    raisedBy: vote.raisedBy,
    voters: vote.voters.map(function (v) {
      return { country: v.country, flag: v.flag, kind: v.kind, uid: v.uid, name: v.name };
    }),
    tally: vote.tally,
    results: vote.results
  };
}

/* The Chair is done looking at a closed vote's result: the panel goes back
   to resting, and the shared meeting is told there is no vote now. */
function endVoteDisplay() {
  if (activeVote && activeVote.status === "closed") {
    activeVote = null;
    publishMeeting({ vote: null });
  }
}

dismissVoteButton.addEventListener("click", function () {
  showVotePanel(voteIdle);
  endVoteDisplay();

  // If an AI delegate's motion interrupted the debate between two
  // lines, the vote on it is now done — carry on.
  resumeIfPending();
});

backToResVoteButton.addEventListener("click", function () {
  showResVotePanel(resVoteIdle);
  endVoteDisplay();
});

/* ---------------------------------------------------------------------
   DELETING AND REOPENING A VOTE (the Chair)
--------------------------------------------------------------------- */

/* Throws the current vote away without counting it: its clock and the AI
   delegates' pending ballots are cancelled, the panel goes back to resting,
   and joined delegates are told there is no vote any more. */
function deleteActiveVote() {
  const vote = activeVote;
  if (!vote) return;

  if (!window.confirm("Delete this vote? Its ballots will not be counted.")) return;

  clearInterval(vote.timerId);
  vote.aiTimers.forEach(clearTimeout);
  logNow("Chair deleted the vote on “" + vote.title + "” without counting it.", "vote");

  activeVote = null;
  if (vote.kind === "resolution") {
    resolutionResult = null;
    showResVotePanel(resVoteIdle);
  } else {
    showVotePanel(voteIdle);
  }
  publishMeeting({ vote: null });
  resumeIfPending();
}

deleteVoteButton.addEventListener("click", deleteActiveVote);
deleteClosedVoteButton.addEventListener("click", deleteActiveVote);

/* Opens a closed vote again, for the delegations that have not voted yet.
   A ballot already cast stays as it is — nobody can change a vote — so this
   only lets the missing delegations vote (AI delegates deliberate again;
   students get their buttons back). */
function reopenActiveVote() {
  const vote = activeVote;
  if (!vote || vote.status !== "closed") return;

  if (vote.voters.every(function (v) { return vote.ballots[v.country]; })) {
    stageStatus.className = "record-hint";
    stageStatus.textContent = "Every delegation has already voted, and a cast vote cannot be changed — nothing to reopen.";
    return;
  }

  const seconds = voteSeconds(vote.kind, vote.voters);
  vote.status = "open";
  vote.tally = null;
  vote.results = null;
  vote.closesAt = Date.now() + seconds * 1000;
  vote.aiTimers = [];
  if (vote.kind === "resolution") resolutionResult = null;

  logNow("Chair reopened the vote on “" + vote.title + "” for delegations that have not voted yet.", "vote");

  // Rows of delegations that have not voted show their buttons again.
  const view = voteView(vote.kind);
  Array.from(view.list.children).forEach(function (row) {
    if (!vote.ballots[row.dataset.country]) {
      const voter = vote.voters.find(function (v) { return v.country === row.dataset.country; });
      const fresh = buildBallotRow(vote, voter);
      view.list.replaceChild(fresh, row);
    }
  });

  renderLiveTally(vote);
  tickVoteClock();
  vote.timerId = setInterval(tickVoteClock, 1000);
  scheduleAiBallots(vote, seconds);

  view.show(view.open);
  publishMeeting({ vote: publicVote(vote) });
}

reopenVoteButton.addEventListener("click", reopenActiveVote);
reopenResVoteButton.addEventListener("click", reopenActiveVote);

/* ---------------------------------------------------------------------
   THE VOTING OUTCOME SCREEN
   "View Results" covers the meeting with the results screen: the resolution,
   the outcome, the aggregate tally, and a row for each country. It is drawn
   by results-view.js from whichever resolution vote this screen last saw,
   and redraws itself as ballots arrive. With no vote yet it shows its empty
   state (0 votes, "No participants recorded").
--------------------------------------------------------------------- */

/* Turns a vote into what results-view.js draws. */
function resultsDataFor(vote) {
  if (!vote) {
    return {
      title: resolutionTitle, text: resolutionText,
      submittedBy: resolutionSubmittedBy, coSponsors: resolutionCosponsors,
      tally: { yes: 0, no: 0, abstain: 0 }, rows: []
    };
  }

  const tally = { yes: 0, no: 0, abstain: 0 };
  const rows = vote.voters.map(function (voter) {
    const choice = choiceOf((vote.ballots || {})[voter.country]) || null;
    if (tally[choice] !== undefined) tally[choice]++;
    return {
      flag: voter.flag,
      country: voter.country,
      kind: voter.kind,
      delegate: voter.kind === "ai" ? "AI delegate" : voter.name,
      choice: choice
    };
  });

  return {
    title: vote.title, text: vote.text,
    submittedBy: vote.submittedBy, coSponsors: vote.coSponsors,
    tally: tally, rows: rows
  };
}

/* Redraws the screen, but only if it is open. */
function refreshResultsView() {
  if (resultsOverlay.classList.contains("is-hidden")) return;
  renderResultsView(resultsBody, resultsDataFor(shownResolution));
}

function openResultsView() {
  document.getElementById("resultsAgenda").textContent = DEBATE_TOPIC;
  resultsOverlay.classList.remove("is-hidden");
  document.body.classList.add("is-modal-open");
  refreshResultsView();
}

function closeResultsView() {
  resultsOverlay.classList.add("is-hidden");
  document.body.classList.remove("is-modal-open");
}

resViewResultsButton.addEventListener("click", openResultsView);
document.getElementById("resultsBack").addEventListener("click", closeResultsView);
document.getElementById("resultsReturn").addEventListener("click", closeResultsView);
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeResultsView();
});

/* "Main dashboard" leaves for the home page. For the Chair that ends the
   meeting (and saves it), so it asks first; a joined delegate just leaves. */
document.getElementById("resultsMain").addEventListener("click", function () {
  if (isMemberMode) {
    leaveButton.click();
  } else if (window.confirm("Going to the main dashboard ends this meeting and saves its log. Continue?")) {
    endButton.click();
  }
});

/* Actually concludes the meeting: writes a closing line to the log, saves
   the whole meeting (including the resolution's outcome and how each
   delegation voted) to Firebase, and returns to the home page. This is the
   one button in the vote panels that ends the meeting. */
wrapUpButton.addEventListener("click", function () {
  finalizeActiveLogEntry();
  logNow(
    "Committee wrap-up: \"" + resolutionTitle + "\" " +
    (resolutionResult && resolutionResult.passed ? "was ADOPTED" : "FAILED to pass") +
    ". Session concluded.",
    "system"
  );
  finishMeetingAndGoHome();
});

/* ---------------------------------------------------------------------
   A JOINED DELEGATE'S VIEW OF A VOTE
   The Chair's screen runs the vote; a student's screen only shows what the
   shared meeting says about it: the motion, a row per delegation, their own
   Yes/No(/Abstain) buttons, and later the result.
--------------------------------------------------------------------- */
let memberShownVoteId = null;
let memberTimerId = null;

function renderMemberVote(vote) {
  clearInterval(memberTimerId);

  if (!vote) {
    memberShownVoteId = null;
    showVotePanel(voteIdle);
    showResVotePanel(resVoteIdle);
    return;
  }

  const view = voteView(vote.kind);

  // The other kind of vote's panel rests while this one is showing.
  if (vote.kind === "resolution") showVotePanel(voteIdle); else showResVotePanel(resVoteIdle);

  if (vote.status === "closed") {
    memberShownVoteId = null;
    renderVoteResult(vote);
    view.show(view.results);
    return;
  }

  // Draw the rows only once per vote, so a ballot already cast is not wiped
  // by the next update from the meeting.
  if (memberShownVoteId !== vote.id) {
    memberShownVoteId = vote.id;

    if (vote.kind === "resolution") {
      resVoteDisplayTitle.textContent = vote.title;
      resVoteDisplayText.textContent = vote.text;
      resVoteDisplayBy.textContent = byLine(vote);
    } else {
      voteMotionDisplay.textContent = vote.title;
      voteMotionOrigin.textContent = vote.raisedBy
        ? "Raised by " + vote.raisedBy.flag + " " + vote.raisedBy.country + " (AI delegate)."
        : "";
    }

    view.list.innerHTML = "";
    vote.voters.forEach(function (voter) {
      const row = buildBallotRow(vote, voter);
      view.list.appendChild(row);
      const already = choiceOf((vote.ballots || {})[voter.country]);
      if (already) applyChoiceToRow(row, already, "", voter.uid === me.uid ? "You voted: " : "Voted: ");
    });

    if (!vote.voters.some(function (v) { return v.uid === me.uid; })) {
      const note = document.createElement("p");
      note.className = "debate-note";
      note.textContent = "You joined after this vote opened, so you cannot vote on it.";
      view.list.prepend(note);
    }
  }

  view.show(view.open);
  renderLiveTally(vote);
  renderCastNotice(vote);

  function tick() {
    const left = Math.ceil((vote.closesAt - Date.now()) / 1000);
    view.timer.textContent = left > 0 ? "Voting closes in " + left + "s" : "Waiting for the Chair to close the vote…";
  }
  tick();
  memberTimerId = setInterval(tick, 1000);
}

/* =====================================================================
   AI DELEGATES RAISING MOTIONS
   An AI delegate proposes a motion from the written list in
   debate-script.js. The Chair then either puts it to a procedural vote
   or rules it out of order — a motion never passes by itself. It can
   happen when the Chair asks for one with the button, or (if switched
   on at setup) by itself between two speeches.
===================================================================== */

/* Picks a motion that has not been raised yet and whose delegation is
   in this debate, at random — or null when there is none left. */
function pickAiMotion() {
  const inDebate = getVotingParticipants().map(function (p) { return p.country; });

  const eligible = [];
  AI_MOTIONS.forEach(function (motion, index) {
    if (usedMotionIndexes.indexOf(index) === -1 && inDebate.indexOf(motion.country) !== -1) {
      eligible.push(index);
    }
  });

  if (eligible.length === 0) return null;

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  usedMotionIndexes.push(chosen);
  return AI_MOTIONS[chosen];
}

/* Shows the motion to the Chair, logs it, and brings the panel into
   view so it is not missed. */
function showAiMotion(motion) {
  const participant = DEBATE_PARTICIPANTS.find(function (p) { return p.country === motion.country; });

  currentAiMotion = { motion: motion, flag: participant ? participant.flag : "", country: motion.country };
  aiMotionFlag.textContent = currentAiMotion.flag;
  aiMotionCountry.textContent = motion.country;
  aiMotionText.textContent = motion.text;

  logNow(
    "🤖 " + currentAiMotion.flag + " " + motion.country +
    " (AI delegate) raised a motion: “" + motion.text + "”",
    "vote"
  );

  linesSinceMotion = 0;
  showVotePanel(aiMotionPanel);
  proceduralVotePanel.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* The Chair asked for a motion with the button. Pauses the debate like
   calling a vote does; pressing Play afterwards carries on. */
raiseAiMotionButton.addEventListener("click", function () {
  const motion = pickAiMotion();

  if (!motion) {
    aiMotionHint.textContent = "No more AI motions are left for the delegations in this debate.";
    return;
  }

  aiMotionHint.textContent = "";
  pauseForVote();
  showAiMotion(motion);
});

/* Called between two lines. Maybe has an AI delegate raise a motion by
   itself — only if that was switched on, a few lines have passed since
   the last one, the vote panel is free, the next line is not the final
   adjournment, and a dice roll says so. If it does, the debate holds
   here: the line that just finished is logged, the controls lock, and
   the next line starts once the Chair has dealt with the motion.
   Returns true if a motion was raised (so the caller should not carry
   on to the next line itself). */
function maybeRaiseAiMotionBetweenLines() {
  if (!autoMotions) return false;
  if (!floorVotingOpen) return false;
  if (linesSinceMotion < MIN_LINES_BETWEEN_MOTIONS) return false;
  if (currentIndex >= playlist.length - 1) return false;
  if (voteIdle.classList.contains("is-hidden")) return false;
  if (Math.random() >= AUTO_MOTION_CHANCE) return false;

  const motion = pickAiMotion();
  if (!motion) return false;

  finalizeActiveLogEntry();
  pendingResume = playCurrent;
  setPlaybackLocked(true);
  stageStatus.className = "record-hint";
  stageStatus.textContent = "An AI delegate has raised a motion — the Chair must rule on it to continue.";
  showAiMotion(motion);
  return true;
}

/* While a motion is waiting on the Chair, the playback buttons are
   locked so the debate cannot be moved along around it. */
function setPlaybackLocked(locked) {
  playPauseButton.disabled = locked;
  prevButton.disabled = locked;
  nextButton.disabled = locked;
}

/* Carries on with the line that was waiting, if a motion interrupted
   the debate between two lines. */
function resumeIfPending() {
  setPlaybackLocked(false);
  if (pendingResume) {
    const resume = pendingResume;
    pendingResume = null;
    resume();
  }
}

aiMotionVoteButton.addEventListener("click", function () {
  if (!currentAiMotion) return;
  const raised = currentAiMotion;
  currentAiMotion = null;
  openProceduralVote(raised.motion.text, raised);
});

aiMotionRejectButton.addEventListener("click", function () {
  if (!currentAiMotion) return;
  logNow(
    "Chair ruled the motion raised by " + currentAiMotion.flag + " " + currentAiMotion.country +
    " (AI delegate) out of order.",
    "vote"
  );
  currentAiMotion = null;
  showVotePanel(voteIdle);
  resumeIfPending();
});

/* =====================================================================
   A JOINED DELEGATE'S SCREEN
   A delegate who opens a meeting from the start page (debate.html?meeting=
   <id>) does not run the debate; they take a seat in it. Their screen is
   the same layout with the Chair's controls hidden, and it simply mirrors
   what the Chair publishes to the shared meeting: the time left, whether
   floor voting is open, who is speaking and what they are saying, and the
   vote currently open — which they can vote in, for their own country.
===================================================================== */
async function enterAsMember(id) {
  isMemberMode = true;
  meetingId = id;
  document.body.classList.add("is-member", "is-live");
  phaseBadge.textContent = "Joining the meeting…";
  endForAllButton.classList.add("is-hidden");

  videoAvatar.textContent = (me.name ? me.name.trim().charAt(0) : "?").toUpperCase();
  videoName.textContent = me.name + " (" + me.country + ")";
  renderVideoTile();
  applyFloorVotingState();
  setActiveSpeaker(null);

  try {
    await joinMeeting(id, me);
  } catch (error) {
    phaseBadge.textContent = "Could not join";
    stageStatus.className = "record-hint is-error";
    stageStatus.textContent = "Could not join this meeting: " + error.message;
    return;
  }

  unwatchMeeting = watchMeeting(id, mirrorMeeting, function (error) {
    stageStatus.className = "record-hint is-error";
    stageStatus.textContent = "Lost contact with the meeting: " + error.message;
  });
}

/* Shows whatever the Chair has published about the meeting. */
function mirrorMeeting(data) {
  meetingData = data;

  if (!data) {
    phaseBadge.textContent = "Meeting not found";
    stageStatus.className = "record-hint is-error";
    stageStatus.textContent = "This meeting no longer exists.";
    return;
  }

  // Only the delegate who started the meeting can end it for everyone — for
  // instance after reloading their own screen, which cannot take the
  // Chair's controls back.
  endForAllButton.classList.toggle("is-hidden", data.hostUid !== me.uid);

  if (data.status === "ended") {
    phaseBadge.textContent = "Meeting ended";
    clearInterval(timerId);
    clearInterval(memberTimerId);
    stageStatus.className = "record-hint";
    stageStatus.textContent = "The meeting has ended. Returning to the start page…";
    setTimeout(function () { window.location.href = "board.html"; }, 2500);
    return;
  }

  phaseBadge.textContent = "Live · Chaired by " + data.hostName;

  // The same countdown the Chair sees.
  if (data.endsAt && data.endsAt !== meetingEndsAt) {
    meetingEndsAt = data.endsAt;
    runMeetingTimer();
  }

  // Floor voting, shown as a status (only the Chair has the switch).
  floorVotingOpen = data.floorOpen !== false;
  applyFloorVotingState();

  // Who is speaking, and what they are saying.
  if (data.now) {
    stageAvatar.textContent = data.now.flag;
    stageCountry.textContent = data.now.speaker;
    stageLabel.textContent = data.now.label;
    stageCaption.textContent = data.now.caption;
    stageCaption.classList.remove("is-hidden");
    setActiveSpeaker(data.now);
  } else {
    setActiveSpeaker(null);
  }

  renderMemberVote(data.vote);
}

leaveButton.addEventListener("click", async function () {
  leaveButton.disabled = true;
  try { await leaveMeeting(meetingId, me); } catch (error) { /* leaving anyway */ }
  if (unwatchMeeting) unwatchMeeting();
  window.location.href = "board.html";
});

endForAllButton.addEventListener("click", async function () {
  endForAllButton.disabled = true;
  try {
    await updateMeeting(meetingId, { status: "ended", vote: null, now: null });
  } catch (error) { /* leaving anyway */ }
  window.location.href = "board.html";
});

/* =====================================================================
   STARTING THE PAGE
   With ?meeting=<id> in the address this delegate is joining a meeting that
   is already running; without it they are the Chair of a new one, and see
   the setup first.
===================================================================== */
requireLogin().then(async function (delegate) {
  me = delegate;
  attachNav(delegate);

  debateTopic.textContent = DEBATE_TOPIC;
  debateSdg.textContent = DEBATE_SDG.goal + " · " + DEBATE_SDG.target;

  // The seats, the AI switches, and the discussion feed. Not waited for,
  // so a slow connection never keeps the rest of the screen hidden.
  startForum(delegate).catch(function () { /* each panel reports its own failure */ });

  const joinId = new URLSearchParams(window.location.search).get("meeting");

  if (joinId) {
    await enterAsMember(joinId);
  } else {
    buildBrief();
    setBriefHidden(localStorage.getItem(BRIEF_HIDDEN_STORAGE_KEY) === "1");
    setGuideHidden(localStorage.getItem(GUIDE_HIDDEN_STORAGE_KEY) === "1");
    buildParticipantList();
    buildLanguageOptions();
    watchSavedLogs();

    // Choices made in the home page's Meeting Details popup.
    const startParams = new URLSearchParams(window.location.search);
    const wantedLength = startParams.get("length");
    if (wantedLength && Array.from(meetingLengthSelect.options).some(function (o) { return o.value === wantedLength; })) {
      meetingLengthSelect.value = wantedLength;
    }
    launchOptions.date = startParams.get("date") || "";
    launchOptions.subtopic = startParams.get("subtopic") || "";
    launchOptions.countries = (startParams.get("countries") || "").split(",").filter(Boolean);
    launchOptions.aiCountries = (startParams.get("ai") || "").split(",").filter(Boolean);
    if (launchOptions.subtopic) debateTopic.textContent = DEBATE_TOPIC + " — " + launchOptions.subtopic;

    // If a key was saved on an earlier visit, fill it in (but the
    // delegate still has to press the button to actually fetch voices).
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) apiKeyInput.value = savedKey;
  }

  document.body.classList.remove("is-loading");
});
