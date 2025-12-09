import type { SVGProps } from "react";

export function TimerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke="currentColor" strokeWidth="2" fill="none">
        <circle cx="12" cy="14" r="8" />
        <line x1="12" x2="12" y1="2" y2="6" />
        <line x1="9" x2="15" y1="2" y2="2" strokeWidth="2.5" />
      </g>

      <g>
        <line
          x1="12"
          y1="14"
          x2="12"
          y2="22"
          stroke="var(--brand)"
          strokeWidth="2.5"
        />
        <circle cx="12" cy="14" r="1.25" fill="var(--brand)" />

        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 14"
          to="-360 12 14"
          dur="60s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}
