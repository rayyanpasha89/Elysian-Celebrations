"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#333d29",
          color: "#f7f1e5",
          display: "flex",
          fontFamily: "Georgia, serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            style={{
              color: "#b6ad90",
              fontFamily: "sans-serif",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Elysian Celebrations
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 500 }}>
            We could not open this page.
          </h1>
          <p style={{ color: "#c2c5aa", lineHeight: 1.7 }}>
            Your information is safe. Retry the request to continue planning.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              background: "transparent",
              border: "1px solid #a68a64",
              color: "#f7f1e5",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.18em",
              marginTop: 24,
              padding: "14px 22px",
              textTransform: "uppercase",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
