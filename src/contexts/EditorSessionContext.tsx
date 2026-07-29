import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export interface EditorViewSession {
  selection?: { anchor: number; head: number };
  viewport?: { scrollTop: number; scrollLeft: number };
  splitLayout?: [number, number];
  hadFocus?: boolean;
}

interface EditorSessionStore {
  getSession: (tabId: string) => EditorViewSession | undefined;
  updateSession: (tabId: string, update: Partial<EditorViewSession>) => void;
  clearSession: (tabId: string) => void;
}

const EditorSessionContext = createContext<EditorSessionStore | null>(null);
const fallbackSessions = new Map<string, EditorViewSession>();
const fallbackStore: EditorSessionStore = {
  getSession: (tabId) => fallbackSessions.get(tabId),
  updateSession: (tabId, update) => {
    fallbackSessions.set(tabId, {
      ...fallbackSessions.get(tabId),
      ...update,
    });
  },
  clearSession: (tabId) => fallbackSessions.delete(tabId),
};

export function EditorSessionProvider({ children }: { children: ReactNode }) {
  const sessionsRef = useRef(new Map<string, EditorViewSession>());
  const value = useMemo<EditorSessionStore>(
    () => ({
      getSession: (tabId) => sessionsRef.current.get(tabId),
      updateSession: (tabId, update) => {
        sessionsRef.current.set(tabId, {
          ...sessionsRef.current.get(tabId),
          ...update,
        });
      },
      clearSession: (tabId) => {
        sessionsRef.current.delete(tabId);
      },
    }),
    [],
  );
  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  );
}

export function useEditorSessionStore() {
  return useContext(EditorSessionContext) ?? fallbackStore;
}
