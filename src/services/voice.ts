// Speech-to-text for dictating a recipe's "modo de preparo".
// Web: the browser's Web Speech API (Chrome, Edge, Safari).
// Android: the system recognizer through expo-speech-recognition, which
// needs a development or release build (it is not inside Expo Go).
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const LANG = "pt-BR";

interface NativeSpeech {
  ExpoSpeechRecognitionModule: {
    start(o: { lang: string; interimResults: boolean; continuous: boolean }): void;
    stop(): void;
    abort(): void;
    isRecognitionAvailable(): boolean;
    requestPermissionsAsync(): Promise<{ granted: boolean }>;
    addListener(
      event: string,
      cb: (e: {
        isFinal?: boolean;
        results?: { transcript: string }[];
        error?: string;
      }) => void,
    ): { remove(): void };
  };
}

function loadNative(): NativeSpeech | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition") as NativeSpeech;
  } catch {
    return null; // Expo Go, or a build made without the native module.
  }
}

interface WebRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: WebResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface WebResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

function webRecognizer(): (new () => WebRecognition) | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => WebRecognition;
    webkitSpeechRecognition?: new () => WebRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function explain(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permita o uso do microfone para ditar.";
    case "no-speech":
      return "Não ouvi nada. Toque no microfone e fale de novo.";
    case "network":
      return "O ditado precisa de internet neste aparelho.";
    case "language-not-supported":
      return "O reconhecimento em português não está instalado neste aparelho.";
    case "aborted":
      return "";
    default:
      return "Não foi possível usar o ditado agora.";
  }
}

export interface Dictation {
  supported: boolean;
  listening: boolean;
  /** Words heard so far that are not final yet. */
  interim: string;
  error: string;
  start: () => void;
  stop: () => void;
}

/** `onText` receives each finished phrase, ready to append to the field. */
export function useDictation(onText: (phrase: string) => void): Dictation {
  const native = useRef(loadNative()).current;
  const Web = useRef(webRecognizer()).current;
  const webRef = useRef<WebRecognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const supported = native
    ? safe(() => native.ExpoSpeechRecognitionModule.isRecognitionAvailable(), false)
    : !!Web;

  useEffect(() => {
    if (!native) return;
    const M = native.ExpoSpeechRecognitionModule;
    const subs = [
      M.addListener("result", (e) => {
        const text = e.results?.[0]?.transcript ?? "";
        if (e.isFinal) {
          setInterim("");
          if (text.trim()) onTextRef.current(text.trim());
        } else setInterim(text);
      }),
      M.addListener("error", (e) => setError(explain(e.error))),
      M.addListener("end", () => {
        setListening(false);
        setInterim("");
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      safe(() => M.abort(), undefined);
    };
  }, [native]);

  useEffect(() => () => webRef.current?.abort(), []);

  const start = useCallback(() => {
    setError("");
    setInterim("");
    if (native) {
      const M = native.ExpoSpeechRecognitionModule;
      M.requestPermissionsAsync()
        .then((p) => {
          if (!p.granted) {
            setError(explain("not-allowed"));
            return;
          }
          M.start({ lang: LANG, interimResults: true, continuous: true });
          setListening(true);
        })
        .catch(() => setError(explain(undefined)));
      return;
    }
    if (!Web) return;
    const rec = new Web();
    rec.lang = LANG;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) onTextRef.current(text);
        } else pending += r[0].transcript;
      }
      setInterim(pending);
    };
    rec.onerror = (e) => setError(explain(e.error));
    rec.onend = () => {
      setListening(false);
      setInterim("");
      webRef.current = null;
    };
    try {
      rec.start();
      webRef.current = rec;
      setListening(true);
    } catch {
      setError(explain(undefined));
    }
  }, [native, Web]);

  const stop = useCallback(() => {
    if (native) safe(() => native.ExpoSpeechRecognitionModule.stop(), undefined);
    else webRef.current?.stop();
  }, [native]);

  return { supported, listening, interim, error, start, stop };
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Appends a dictated phrase to existing text as a tidy sentence. */
export function appendPhrase(text: string, phrase: string): string {
  const clean = phrase.trim();
  if (!clean) return text;
  const sentence = clean.charAt(0).toUpperCase() + clean.slice(1);
  const ended = /[.!?:;]$/.test(sentence) ? sentence : `${sentence}.`;
  const base = text.trimEnd();
  if (!base) return ended;
  return `${base}${base.endsWith("\n") ? "" : " "}${ended}`;
}
