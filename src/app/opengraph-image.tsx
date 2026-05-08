import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Vendo Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          background: "#2B7A5E",
          padding: "80px",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.85, marginBottom: 24 }}>
          docs.vendo.run
        </div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Vendo SDKs
        </div>
        <div style={{ fontSize: 36, marginTop: 32, opacity: 0.92, lineHeight: 1.3 }}>
          Python · TypeScript · Swift
        </div>
        <div style={{ fontSize: 26, marginTop: 24, opacity: 0.75, lineHeight: 1.4 }}>
          Run as plain OSS or as a Vendo deployment with one env var.
        </div>
      </div>
    ),
    { ...size },
  );
}
