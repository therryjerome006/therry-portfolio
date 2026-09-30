import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${profile.name} — ${profile.role}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f8ff",
          color: "#12263f",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: "#2f6fed" }}>
          SOFTWARE DEVELOPER
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 1 }}>{profile.name}</div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#51627a" }}>
            Applications web modernes · Next.js · React
          </div>
        </div>
        <div style={{ width: 180, height: 8, background: "#2f6fed" }} />
      </div>
    ),
    { ...size },
  );
}
