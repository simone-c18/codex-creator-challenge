export function speak(text, persona, onEnd) {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  const voicePreferences = {
    "Friendly Startup": ["Samantha", "Karen", "Moira", "Google UK English Female"],
    "Tough FAANG": ["Daniel", "Alex", "Fred", "Google UK English Male"],
    "HR Generalist": ["Samantha", "Victoria", "Google US English"],
    Executive: ["Daniel", "Gordon", "Google UK English Male"],
  };

  const preferred = voicePreferences[persona] || [];
  const match = preferred
    .map((name) => voices.find((voice) => voice.name.includes(name)))
    .find(Boolean);

  if (match) {
    utterance.voice = match;
  }

  utterance.rate = 0.88;
  utterance.pitch = 1.05;
  utterance.volume = 1.0;

  const resumeInfinity = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      clearInterval(resumeInfinity);
    } else {
      window.speechSynthesis.resume();
    }
  }, 5000);

  utterance.onend = () => {
    clearInterval(resumeInfinity);
    if (onEnd) {
      onEnd();
    }
  };

  utterance.onerror = (error) => {
    clearInterval(resumeInfinity);
    console.error("TTS error:", error);
    if (onEnd) {
      onEnd();
    }
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
}

export function speakWhenReady(text, persona, onEnd) {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    speak(text, persona, onEnd);
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      speak(text, persona, onEnd);
    };
  }
}
