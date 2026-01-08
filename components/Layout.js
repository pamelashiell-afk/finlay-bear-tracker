import Link from "next/link";

export default function Layout({ children, showBackButton = false, backButtonColor = "#0288d1" }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #e0f7fa, #b2ebf2)",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
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