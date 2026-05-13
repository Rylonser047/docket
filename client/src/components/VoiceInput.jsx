import { useState, useRef } from 'react';

export default function VoiceInput({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);

  const toggle = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-ZA';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onTranscript(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop recording' : 'Voice input'}
      className={`p-2 rounded-lg transition-all ${
        listening
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      🎤
    </button>
  );
}
