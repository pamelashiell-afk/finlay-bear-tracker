import Link from "next/link";


export default function Layout({ children, showBackButton = false, backButtonColor = "#0288d1" }) {
  return (
    <div
     style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "rgba(255, 255, 255, 0.92)",
          borderRadius: "18px",
          padding: "24px",      }}
    >
      {showBackButton && (
        <div style={{ marginBottom: "20px" }}>
          <Link href="/">
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: backButtonColor,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ← Back to All Bears
            </button>
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}