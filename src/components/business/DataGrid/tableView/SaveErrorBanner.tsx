interface SaveErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

export function SaveErrorBanner({ error, onDismiss }: SaveErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="px-4 py-2 border-t border-destructive/30 bg-destructive/10 text-destructive text-xs font-mono whitespace-pre-wrap">
      {error}
      <button
        className="ml-2 underline hover:no-underline"
        onClick={onDismiss}
      >
        Close
      </button>
    </div>
  );
}
