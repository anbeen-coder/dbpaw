import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEditorSessionStore } from "@/contexts/EditorSessionContext";

export function useEditorViewSession(tabId: string) {
  const store = useEditorSessionStore();
  const viewRef = useRef<EditorView | null>(null);
  const frameRef = useRef<number | null>(null);
  const restoringRef = useRef(false);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const viewportRef = useRef({ scrollTop: 0, scrollLeft: 0 });
  const hadEditorFocusRef = useRef(false);

  const saveView = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const selection = view.state.selection.main;
    store.updateSession(tabId, {
      selection: {
        anchor: selection.anchor,
        head: selection.head,
      },
      viewport: viewportRef.current,
      hadFocus: hadEditorFocusRef.current,
    });
  }, [store, tabId]);

  const scheduleSave = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      saveView();
    });
  }, [saveView]);

  const sessionExtension = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (
          !restoringRef.current &&
          (update.selectionSet || update.focusChanged)
        ) {
          if (update.view.hasFocus) hadEditorFocusRef.current = true;
          scheduleSave();
        }
      }),
    [scheduleSave],
  );

  const onCreateEditor = useCallback(
    (view: EditorView) => {
      scrollCleanupRef.current?.();
      viewRef.current = view;
      const session = store.getSession(tabId);
      hadEditorFocusRef.current = session?.hadFocus ?? false;
      viewportRef.current = session?.viewport ?? {
        scrollTop: view.scrollDOM.scrollTop,
        scrollLeft: view.scrollDOM.scrollLeft,
      };
      restoringRef.current = true;
      if (session?.selection) {
        const docLength = view.state.doc.length;
        const anchor = Math.min(session.selection.anchor, docLength);
        const head = Math.min(session.selection.head, docLength);
        view.dispatch({
          selection: EditorSelection.single(anchor, head),
        });
      }
      const onScroll = () => {
        viewportRef.current = {
          scrollTop: view.scrollDOM.scrollTop,
          scrollLeft: view.scrollDOM.scrollLeft,
        };
        scheduleSave();
      };
      view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
      scrollCleanupRef.current = () =>
        view.scrollDOM.removeEventListener("scroll", onScroll);

      requestAnimationFrame(() => {
        if (session?.hadFocus) view.focus();
        requestAnimationFrame(() => {
          if (session?.viewport) {
            view.scrollDOM.scrollTop = session.viewport.scrollTop;
            view.scrollDOM.scrollLeft = session.viewport.scrollLeft;
            viewportRef.current = session.viewport;
          }
          restoringRef.current = false;
        });
      });
    },
    [scheduleSave, store, tabId],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      saveView();
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
      viewRef.current = null;
    },
    [saveView],
  );

  return {
    sessionExtension,
    onCreateEditor,
    initialSplitLayout: store.getSession(tabId)?.splitLayout,
    saveSplitLayout: (layout: number[]) => {
      if (layout.length !== 2) return;
      store.updateSession(tabId, {
        splitLayout: [layout[0], layout[1]],
      });
    },
  };
}
