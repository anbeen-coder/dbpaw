import { mock } from "bun:test";

type FrameCallback = (time: number) => void;

const sessions = new Map<
  string,
  {
    selection?: { anchor: number; head: number };
    viewport?: { scrollTop: number; scrollLeft: number };
    splitLayout?: [number, number];
    hadFocus?: boolean;
  }
>();
const updateSessionMock = mock(
  (
    tabId: string,
    update: {
      selection?: { anchor: number; head: number };
      viewport?: { scrollTop: number; scrollLeft: number };
      splitLayout?: [number, number];
      hadFocus?: boolean;
    },
  ) => {
    sessions.set(tabId, { ...sessions.get(tabId), ...update });
  },
);
const clearSessionMock = mock((tabId: string) => sessions.delete(tabId));
const store = {
  getSession: (tabId: string) => sessions.get(tabId),
  updateSession: updateSessionMock,
  clearSession: clearSessionMock,
};

mock.module("@/contexts/EditorSessionContext", () => ({
  useEditorSessionStore: () => store,
}));
mock.module("@codemirror/state", () => ({
  EditorSelection: {
    single: (anchor: number, head: number) => ({ anchor, head }),
  },
}));
mock.module("@codemirror/view", () => ({
  EditorView: {
    updateListener: {
      of: (listener: (update: FakeUpdate) => void) => listener,
    },
  },
}));

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useEditorViewSession } from "./useEditorViewSession";

interface FakeUpdate {
  selectionSet: boolean;
  focusChanged: boolean;
  view: FakeView;
}

interface FakeView {
  state: {
    selection: { main: { anchor: number; head: number } };
    doc: { length: number };
  };
  scrollDOM: {
    scrollTop: number;
    scrollLeft: number;
    addEventListener: ReturnType<typeof mock>;
    removeEventListener: ReturnType<typeof mock>;
  };
  dispatch: ReturnType<typeof mock>;
  focus: ReturnType<typeof mock>;
  hasFocus: boolean;
}

let frameId = 0;
let frames = new Map<number, FrameCallback>();
let originalRequestAnimationFrame: typeof requestAnimationFrame;
let originalCancelAnimationFrame: typeof cancelAnimationFrame;

function flushNextFrame() {
  const pending = [...frames.entries()];
  frames = new Map();
  for (const [, callback] of pending) callback(0);
}

function flushRestoreFrames() {
  flushNextFrame();
  flushNextFrame();
}

function makeView(docLength = 20): FakeView {
  return {
    state: {
      selection: { main: { anchor: 2, head: 5 } },
      doc: { length: docLength },
    },
    scrollDOM: {
      scrollTop: 10,
      scrollLeft: 4,
      addEventListener: mock(),
      removeEventListener: mock(),
    },
    dispatch: mock(),
    focus: mock(),
    hasFocus: false,
  };
}

beforeEach(() => {
  sessions.clear();
  updateSessionMock.mockClear();
  clearSessionMock.mockClear();
  frameId = 0;
  frames = new Map();
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((callback: FrameCallback) => {
    const id = ++frameId;
    frames.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    frames.delete(id);
  }) as typeof cancelAnimationFrame;
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
});

describe("useEditorViewSession", () => {
  test("throttles selection, focus, and scroll saves to one RAF", () => {
    const { result } = renderHook(() => useEditorViewSession("tab-1"));
    const view = makeView();

    act(() => {
      result.current.onCreateEditor(view as never);
      flushRestoreFrames();
    });
    updateSessionMock.mockClear();

    act(() => {
      const listener = result.current.sessionExtension as unknown as (
        update: FakeUpdate,
      ) => void;
      view.hasFocus = true;
      listener({ selectionSet: true, focusChanged: false, view });
      listener({ selectionSet: false, focusChanged: true, view });
      view.scrollDOM.scrollTop = 90;
      const onScroll = view.scrollDOM.addEventListener.mock.calls[0][1];
      onScroll();
    });

    expect(updateSessionMock).not.toHaveBeenCalled();
    act(() => flushNextFrame());
    expect(updateSessionMock).toHaveBeenCalledTimes(1);
    expect(sessions.get("tab-1")).toMatchObject({
      selection: { anchor: 2, head: 5 },
      viewport: { scrollTop: 90, scrollLeft: 4 },
      hadFocus: true,
    });
  });

  test("flushes the latest view synchronously when unmounted", () => {
    const { result, unmount } = renderHook(() => useEditorViewSession("tab-1"));
    const view = makeView();

    act(() => {
      result.current.onCreateEditor(view as never);
      flushRestoreFrames();
    });
    updateSessionMock.mockClear();
    act(() => {
      const listener = result.current.sessionExtension as unknown as (
        update: FakeUpdate,
      ) => void;
      listener({ selectionSet: true, focusChanged: false, view });
    });
    expect(frames.size).toBe(1);

    act(() => unmount());

    expect(frames.size).toBe(0);
    expect(updateSessionMock).toHaveBeenCalledTimes(1);
    expect(view.scrollDOM.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  test("clamps restored selections to the current document bounds", () => {
    sessions.set("tab-1", {
      selection: { anchor: -4, head: 99 },
    });
    const { result } = renderHook(() => useEditorViewSession("tab-1"));
    const view = makeView(12);

    act(() => result.current.onCreateEditor(view as never));

    expect(view.dispatch).toHaveBeenCalledWith({
      selection: { anchor: 0, head: 12 },
    });
  });

  test("does not recreate a closed tab session after delayed cleanup", () => {
    const { result, unmount } = renderHook(() => useEditorViewSession("tab-1"));
    const view = makeView();

    act(() => {
      result.current.onCreateEditor(view as never);
      flushRestoreFrames();
      unmount();
      requestAnimationFrame(() => store.clearSession("tab-1"));
      flushNextFrame();
    });

    expect(clearSessionMock).toHaveBeenCalledWith("tab-1");
    expect(sessions.has("tab-1")).toBe(false);
  });
});
