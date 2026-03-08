import { ImageResponse } from "next/og";

export const runtime = "edge";

const iconSize = {
  width: 180,
  height: 180,
};

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(180deg, #16213a 0%, #0f172a 55%, #0a0f1d 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 40,
            height: 144,
            position: "absolute",
            width: 144,
          }}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width="112"
          height="112"
          fill="none"
        >
          <path
            d="M26 35L50 22L74 35V64L50 78L26 64V35Z"
            stroke="#ffffff"
            strokeWidth="5"
          />
          <path
            d="M50 22V78M26 35L50 50L74 35M26 64L50 50L74 64"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="5.5" fill="#ffffff" />
        </svg>
      </div>
    ),
    iconSize,
  );
}
