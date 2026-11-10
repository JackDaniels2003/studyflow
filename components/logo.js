// variante "claro" e para fundos coloridos (painel do login).
export default function Logo({ className = "", variante }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect
          width="32"
          height="32"
          rx="9"
          className={variante === "claro" ? "fill-white/15" : "fill-indigo-600"}
        />
        <path
          d="M9 11.5c3-2 5.5-2 7 0s4 2 7 0M9 16.5c3-2 5.5-2 7 0s4 2 7 0M9 21.5c3-2 5.5-2 7 0s4 2 7 0"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      StudyFlow
    </span>
  );
}
