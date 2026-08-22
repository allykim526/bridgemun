/* =====================================================================
   speech.js — speaking instead of typing

   What this file does:
   Lets a delegate press a record button, speak, and have their words
   appear as text in a writing box. This is BridgeMUN's speech-to-text
   (STT) feature, and it exists because MUN is a spoken activity — a
   delegate should be able to practise saying their speech out loud
   rather than typing it.

   How it works:
   It uses the Web Speech API, which is speech recognition already built
   into the browser. That means no server, no API key, and no cost.

   Important limitation:
   Only Chrome (and Edge) support this properly. Safari and Firefox do
   not, so this file checks first and says so clearly rather than
   failing silently. The page must also be opened over http:// or
   https:// — not by double-clicking the file — because browsers only
   allow microphone access on a real address.
===================================================================== */

// Chrome exposes this under a prefixed name, so we check both.
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

/* Whether this browser can do speech recognition at all. Pages use this
   to hide or disable the record button instead of offering something
   that cannot work. */
export const speechSupported = Boolean(SpeechRecognition);

/* ---------------------------------------------------------------------
   createRecorder
   Builds one recorder tied to one writing box.

   Arguments:
     textarea   — the writing box that recognised words are written into
     onStateChange — called with "recording" or "idle" so the page can
                     restyle its button
     onError    — called with a plain-English message when something
                  goes wrong (microphone blocked, no sound heard, …)

   Returns an object with toggle(), which starts recording if stopped
   and stops it if recording — one button, both jobs.
--------------------------------------------------------------------- */
export function createRecorder(textarea, onStateChange, onError) {
  if (!speechSupported) {
    return {
      toggle: function () {
        onError("Speech recognition is not supported in this browser. Please use Chrome.");
      }
    };
  }

  const recognition = new SpeechRecognition();

  // The committee debates in English, so the recogniser listens for
  // English. Changing this one line changes the language — "ko-KR"
  // would make it listen for Korean.
  recognition.lang = "en-US";

  // Keeps listening through natural pauses, instead of stopping after
  // the first sentence — a delegate's speech is longer than one line.
  recognition.continuous = true;

  // Shows words as they are being recognised, so the delegate can see
  // that the microphone is actually picking them up.
  recognition.interimResults = true;

  let isRecording = false;

  // Whatever was already written before recording started. New speech is
  // added after it, so pressing record never wipes existing text.
  let textBeforeRecording = "";

  // Words the recogniser has finalised during this recording session.
  let confirmedText = "";

  /* Runs every time the recogniser has an update. It rebuilds the box
     from three pieces: what was there before, what has been confirmed,
     and what is still being guessed at. */
  recognition.onresult = function (event) {
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        confirmedText += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }

    textarea.value = (textBeforeRecording + confirmedText + interimText).trim();

    // Tells the rest of the page the box changed, so things like a
    // character counter or a disabled Send button stay in step.
    textarea.dispatchEvent(new Event("input"));
  };

  /* Turns the browser's short error codes into something a student can
     act on. */
  recognition.onerror = function (event) {
    if (event.error === "not-allowed") {
      onError("Microphone access was blocked. Allow the microphone in your browser and try again.");
    } else if (event.error === "no-speech") {
      onError("No speech was heard. Try speaking a little closer to the microphone.");
    } else if (event.error === "audio-capture") {
      onError("No microphone was found on this device.");
    } else {
      onError("Recording stopped unexpectedly (" + event.error + ").");
    }
  };

  // Whenever recording ends — on purpose or by itself — the button goes
  // back to its resting state.
  recognition.onend = function () {
    isRecording = false;
    onStateChange("idle");
  };

  return {
    toggle: function () {
      if (isRecording) {
        recognition.stop();
        return;
      }

      // Remember what was already typed, and start a fresh transcript.
      textBeforeRecording = textarea.value ? textarea.value.trim() + " " : "";
      confirmedText = "";

      try {
        recognition.start();
        isRecording = true;
        onStateChange("recording");
      } catch (error) {
        onError("Could not start recording. Make sure the page is open over http:// or https://, not as a local file.");
      }
    }
  };
}
