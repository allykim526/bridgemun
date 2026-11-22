/* =====================================================================
   meeting.js — a meeting several delegates can be in at once

   What this file does:
   Everything the platform needs to share ONE live meeting between
   delegates on different computers, through the same Firebase project
   every other page uses. The delegate who starts a meeting (the Chair,
   also called the host) creates a "meetings" document; other delegates
   open it from the start page to join. The host publishes what everyone
   must see — the time left, who is speaking, whether floor voting is
   open, and the vote currently open — and each delegate casts their own
   country's ballot as its own small document, so nobody can cast
   anybody else's.

   The meeting itself, and what each screen does with this, lives in
   debate.js. Keeping the Firestore calls here means that file never has
   to know how the data is stored.
===================================================================== */

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* A country name made safe to use inside a Firestore document name
   ("Republic of Korea" -> "Republic_of_Korea"). */
export function countryKey(country) {
  return country.replace(/[^A-Za-z0-9]+/g, "_");
}

/* Starts a meeting. "details" is whatever the host wants stored on it
   (topic, participants, when it ends, …); this adds who the host is,
   marks it live, and returns the new meeting's id. */
export async function createMeeting(host, details) {
  const members = {};
  members[host.uid] = { name: host.name, country: host.country, joinedAt: Date.now() };

  const ref = await addDoc(collection(db, "meetings"), Object.assign({}, details, {
    hostUid: host.uid,
    hostName: host.name,
    hostCountry: host.country,
    status: "live",
    members: members,
    vote: null,
    now: null,
    createdAt: serverTimestamp()
  }));

  return ref.id;
}

/* Calls onData with the meeting's current contents every time it changes,
   or with null if it does not exist. Returns the function that stops
   listening. */
export function watchMeeting(id, onData, onError) {
  return onSnapshot(doc(db, "meetings", id), function (snapshot) {
    onData(snapshot.exists() ? Object.assign({ id: snapshot.id }, snapshot.data()) : null);
  }, onError);
}

/* Changes some fields on a meeting. */
export function updateMeeting(id, patch) {
  return updateDoc(doc(db, "meetings", id), patch);
}

/* A delegate takes their seat in a meeting that is already running. */
export function joinMeeting(id, delegate) {
  const patch = {};
  patch["members." + delegate.uid] = {
    name: delegate.name,
    country: delegate.country,
    joinedAt: Date.now()
  };
  return updateDoc(doc(db, "meetings", id), patch);
}

/* A delegate leaves. */
export function leaveMeeting(id, delegate) {
  const patch = {};
  patch["members." + delegate.uid] = deleteField();
  return updateDoc(doc(db, "meetings", id), patch);
}

/* One delegate's ballot on one vote. It is its own document, named after
   the vote and the country, and can only ever be created once — so a
   ballot can be neither changed nor cast twice. */
export function castBallot(meetingId, voteId, country, choice, delegate) {
  return setDoc(
    doc(db, "meetings", meetingId, "ballots", voteId + "__" + countryKey(country)),
    {
      voteId: voteId,
      country: country,
      choice: choice,
      uid: delegate.uid,
      name: delegate.name,
      at: Date.now()
    }
  );
}

/* Calls onBallot once for every ballot that arrives (including ones that
   were already there when listening began). Used by the host. */
export function watchBallots(meetingId, onBallot, onError) {
  return onSnapshot(collection(db, "meetings", meetingId, "ballots"), function (snapshot) {
    snapshot.docChanges().forEach(function (change) {
      if (change.type === "added") onBallot(change.doc.data());
    });
  }, onError);
}

/* Meetings that are running right now, newest first, for the start page.
   A meeting nobody has touched for hours is probably one whose host just
   closed the tab, so only recent ones are listed. */
export function watchLiveMeetings(onList, onError) {
  const liveQuery = query(collection(db, "meetings"), where("status", "==", "live"), limit(20));

  return onSnapshot(liveQuery, function (snapshot) {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    const list = [];

    snapshot.forEach(function (docSnap) {
      const data = docSnap.data();
      const startedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().getTime() : Date.now();
      if (startedAt >= cutoff) list.push(Object.assign({ id: docSnap.id, startedAt: startedAt }, data));
    });

    list.sort(function (a, b) { return b.startedAt - a.startedAt; });
    onList(list);
  }, onError);
}
