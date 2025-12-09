import type { SVGProps } from "react";

export function StopwatchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />

      <g>
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="3"
          stroke="#00aa6f"
          strokeWidth="2.5"
        />

        <circle cx="12" cy="12" r="1.25" fill="#00aa6f" />

        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="60s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}
