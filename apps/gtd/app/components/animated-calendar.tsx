"use client";

type AnimatedCalendarProps = {
  className?: string;
  size?: number;
};

export function AnimatedCalendar({
  className,
  size = 100,
}: AnimatedCalendarProps) {
  return (
    <div className={className}>
      <style>
        {`
          @keyframes cycleTopRow {
            0%, 20% {
              opacity: 1;
              transform: translateY(0);
            }
            30% {
              opacity: 0;
              transform: translateY(0);
            }
            31% {
              opacity: 0;
              transform: translateY(4px);
            }
            40%, 60% {
              opacity: 1;
              transform: translateY(4px);
            }
            80%, 100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes cycleBottomRow {
            0%, 20% {
              opacity: 1;
              transform: translateY(0);
            }
            40%, 60% {
              opacity: 1;
              transform: translateY(-4px);
            }
            70% {
              opacity: 0;
              transform: translateY(-4px);
            }
            71% {
              opacity: 0;
              transform: translateY(0);
            }
            80%, 100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animated-calendar-row-top {
            animation: cycleTopRow 4s ease-in-out infinite;
          }

          .animated-calendar-row-bottom {
            animation: cycleBottomRow 4s ease-in-out infinite;
          }
        `}
      </style>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={size}
        height={size}
      >
        <rect
          width="18"
          height="18"
          x="3"
          y="4"
          rx="2"
          stroke="#000000"
          fill="#ffffff"
        />
        <path d="M16 2v4" stroke="#000000" />
        <path d="M8 2v4" stroke="#000000" />
        <path d="M3 10h18" stroke="#000000" />

        <g className="animated-calendar-row-top">
          <path d="M17 14h-6" stroke="#ff6900" />
          <path d="M7 14h.01" stroke="#000000" strokeWidth="3" />
        </g>

        <g className="animated-calendar-row-bottom">
          <path d="M13 18H7" stroke="#ff6900" />
          <path d="M17 18h.01" stroke="#000000" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}
