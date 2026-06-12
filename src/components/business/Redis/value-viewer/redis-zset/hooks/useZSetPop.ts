import { useState } from "react";

export function useZSetPop(
  onZPopMin?: (count?: number) => Promise<void>,
  onZPopMax?: (count?: number) => Promise<void>,
) {
  const [popDialog, setPopDialog] = useState<{
    type: "min" | "max";
  } | null>(null);
  const [isPopping, setIsPopping] = useState(false);

  const openPopDialog = (type: "min" | "max") => {
    setPopDialog({ type });
  };

  const closePopDialog = () => {
    setPopDialog(null);
  };

  const handlePop = async () => {
    if (!popDialog) return;
    setIsPopping(true);
    try {
      if (popDialog.type === "min" && onZPopMin) {
        await onZPopMin();
      } else if (popDialog.type === "max" && onZPopMax) {
        await onZPopMax();
      }
    } finally {
      setIsPopping(false);
      setPopDialog(null);
    }
  };

  return {
    popDialog,
    isPopping,
    openPopDialog,
    closePopDialog,
    handlePop,
  };
}
