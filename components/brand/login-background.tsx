"use client";

export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
      <div
        className="absolute -top-40 left-[-10%] h-[520px] w-[520px] rounded-full blur-[110px] opacity-40"
        style={{
          background: "radial-gradient(circle, oklch(0.45 0.01 260 / 0.7) 0%, transparent 70%)",
          animation: "login-orb-a 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-48 right-[-8%] h-[580px] w-[580px] rounded-full blur-[120px] opacity-35"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.005 260 / 0.55) 0%, transparent 72%)",
          animation: "login-orb-b 24s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[28%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[100px] opacity-25"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0 0 / 0.18) 0%, transparent 70%)",
          animation: "login-orb-c 18s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.95 0 0 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 18%, transparent 78%)",
          animation: "login-grid-pan 32s linear infinite",
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent via-white/[0.04] to-transparent"
        style={{ animation: "login-scan 12s ease-in-out infinite" }}
      />

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute bottom-0 h-px w-px rounded-full bg-white/50"
          style={{
            left: `${8 + ((i * 6.1) % 84)}%`,
            animation: `login-particle ${10 + (i % 6)}s linear ${i * 0.5}s infinite`,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
