import { useEffect, useRef } from "react";

type Options = { lockBody?: boolean };

/** Escape to close; optional body scroll lock while `isOpen` (default on). */
export function useModalDismiss(
  isOpen: boolean,
  onRequestClose: () => void,
  { lockBody = true }: Options = {}
) {
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    if (lockBody) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (lockBody) document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, lockBody]);
}
