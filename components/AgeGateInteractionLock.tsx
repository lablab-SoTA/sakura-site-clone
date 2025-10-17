"use client";

import { useEffect } from "react";

export default function AgeGateInteractionLock() {
  useEffect(() => {
    document.body.classList.add("age-gate-active");
    const header = document.querySelector<HTMLElement>(".layout__header");
    const footer = document.querySelector<HTMLElement>(".layout__footer");

    if (header) {
      header.setAttribute("aria-hidden", "true");
      header.setAttribute("inert", "true");
    }

    if (footer) {
      footer.setAttribute("aria-hidden", "true");
      footer.setAttribute("inert", "true");
    }

    return () => {
      document.body.classList.remove("age-gate-active");
      if (header) {
        header.removeAttribute("aria-hidden");
        header.removeAttribute("inert");
      }
      if (footer) {
        footer.removeAttribute("aria-hidden");
        footer.removeAttribute("inert");
      }
    };
  }, []);

  return null;
}
