import { create } from 'zustand';

export type TestMode = 'time' | 'words' | 'quote' | 'zen';
export type TestDuration = 15 | 30 | 60 | 120 | 180;
export type TestStatus = 'idle' | 'running' | 'finished';

interface TestSettings {
  mode: TestMode;
  duration: TestDuration;
  wordCount: number;
  punctuation: boolean;
  numbers: boolean;
}

interface TestState {
  settings: TestSettings;
  status: TestStatus;
  targetText: string;
  typedText: string;
  currentIndex: number;
  startTime: number | null;
  endTime: number | null;
  wpmHistory: number[];
  
  // Actions
  setSettings: (settings: Partial<TestSettings>) => void;
  setTargetText: (text: string) => void;
  startTest: () => void;
  updateTypedText: (text: string) => void;
  finishTest: () => void;
  resetTest: () => void;
  addWpmSample: (wpm: number) => void;
}

export const useTestStore = create<TestState>((set) => ({
  settings: {
    mode: 'time',
    duration: 30,
    wordCount: 50,
    punctuation: false,
    numbers: false,
  },
  status: 'idle',
  targetText: '',
  typedText: '',
  currentIndex: 0,
  startTime: null,
  endTime: null,
  wpmHistory: [],
  
  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  
  setTargetText: (text) =>
    set({ targetText: text }),
  
  startTest: () =>
    set({
      status: 'running',
      startTime: Date.now(),
      typedText: '',
      currentIndex: 0,
      wpmHistory: [],
    }),
  
  updateTypedText: (text) =>
    set({
      typedText: text,
      currentIndex: text.length,
    }),
  
  finishTest: () =>
    set({
      status: 'finished',
      endTime: Date.now(),
    }),
  
  resetTest: () =>
    set({
      status: 'idle',
      typedText: '',
      currentIndex: 0,
      startTime: null,
      endTime: null,
      wpmHistory: [],
    }),
  
  addWpmSample: (wpm) =>
    set((state) => ({
      wpmHistory: [...state.wpmHistory, wpm],
    })),
}));
