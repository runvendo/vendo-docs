import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-static";
export const alt = "Vendo Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const logoBuffer = fs.readFileSync(
    path.join(process.cwd(), "public", "logo-small.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#FAFAF8",
          padding: "80px",
          color: "#1A1A18",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
        <img src={logoSrc} width={140} height={112} style={{ marginBottom: 32 }} />
        <div style={{ fontSize: 32, color: "#6B6B60", marginBottom: 16 }}>
          docs.vendo.run
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#1A1A18",
          }}
        >
          Vendo Docs
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 24,
            color: "#2B7A5E",
            lineHeight: 1.3,
          }}
        >
          Build and ship tools on Vendo.
        </div>
      </div>
    ),
    { ...size },
  );
}
