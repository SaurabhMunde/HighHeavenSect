const petals = [
  { left: "4%", delay: "0s", duration: "13s", drift: "28px", size: "10px" },
  { left: "11%", delay: "-3s", duration: "11s", drift: "-24px", size: "8px" },
  { left: "18%", delay: "-7s", duration: "14s", drift: "34px", size: "9px" },
  { left: "25%", delay: "-1s", duration: "12s", drift: "-18px", size: "11px" },
  { left: "32%", delay: "-5s", duration: "10s", drift: "22px", size: "9px" },
  { left: "39%", delay: "-8s", duration: "15s", drift: "-30px", size: "10px" },
  { left: "46%", delay: "-2s", duration: "12s", drift: "26px", size: "8px" },
  { left: "53%", delay: "-9s", duration: "14s", drift: "-20px", size: "10px" },
  { left: "60%", delay: "-4s", duration: "11s", drift: "24px", size: "9px" },
  { left: "67%", delay: "-6s", duration: "13s", drift: "-28px", size: "11px" },
  { left: "74%", delay: "-10s", duration: "12s", drift: "18px", size: "8px" },
  { left: "81%", delay: "-2.5s", duration: "15s", drift: "-24px", size: "10px" },
  { left: "88%", delay: "-7.5s", duration: "11s", drift: "30px", size: "9px" },
  { left: "95%", delay: "-5.5s", duration: "13s", drift: "-18px", size: "10px" },
] as const;

export function CherryBlossomOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[4] overflow-hidden" aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-12%] inline-block rounded-[60%_45%_65%_40%] bg-[#ffd3e7]/70 shadow-[0_0_8px_rgba(255,192,220,0.35)] animate-sakura-fall"
          style={
            {
              left: p.left,
              width: p.size,
              height: `calc(${p.size} * 0.72)`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              "--sakura-drift": p.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
