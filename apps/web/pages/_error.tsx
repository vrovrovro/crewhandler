import type { NextPageContext } from "next";

type ErrorPageProps = {
  statusCode?: number;
};

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          borderRadius: "32px",
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "32px",
          textAlign: "center",
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          {statusCode ?? 500}
        </p>
        <h1
          style={{
            marginTop: "16px",
            marginBottom: 0,
            fontSize: "32px",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            marginTop: "12px",
            marginBottom: 0,
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#64748b",
          }}
        >
          Please try again, or head back to login if the issue continues.
        </p>
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "#020617",
              color: "#ffffff",
              padding: "12px 20px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Go home
          </a>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#334155",
              padding: "12px 20px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Back to login
          </a>
        </div>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};
