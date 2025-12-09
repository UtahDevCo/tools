import type { SVGProps } from "react";

export function WktLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        ry="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M5,12 L7,12 L10,7 L14,17 L17,12 L19,12"
        stroke="var(--brand)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="10" cy="7" r="1.5" fill="var(--brand)" />
    </svg>
  );
}
