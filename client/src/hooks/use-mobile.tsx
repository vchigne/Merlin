import { useState, useEffect } from "react";

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window exists (for SSR)
    if (typeof window === "undefined") return;

    // Initial check
    setIsMobile(window.innerWidth < breakpoint);

    // Add resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}
