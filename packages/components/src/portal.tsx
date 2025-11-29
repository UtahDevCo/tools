"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PortalProps = {
  children: React.ReactNode;
  id?: string;
};

/**
 * Portal component that renders children into a DOM node outside of the parent hierarchy.
 * Creates a container div if one doesn't exist with the given id.
 */
export function Portal({ children, id = "portal-root" }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(id);

    if (!element) {
      element = document.createElement("div");
      element.id = id;
      document.body.appendChild(element);
    }

    setContainer(element);

    return () => {
      // Only remove the element if it's empty and we created it
      if (element && element.childNodes.length === 0 && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, [id]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}
