import logo from "@/assets/logo.png";

type BrandMarkProps = {
  size?: "sm" | "md";
  showWordmark?: boolean;
};

const cropSizes = {
  sm: "h-[40px] w-[40px] rounded-[16px]",
  md: "h-[48px] w-[48px] rounded-[18px]"
};

export function BrandMark({
  size = "md",
  showWordmark = true
}: BrandMarkProps) {
  return (
    <div className="flex items-center gap-[12px]">
      <div className={`overflow-hidden bg-transparent shadow-none ${cropSizes[size]}`}>
        <img
          alt="Tipi logo"
          className="h-full w-full scale-[1.15] object-cover object-top"
          src={logo}
        />
      </div>
      {showWordmark ? (
        <div>
          <p className="font-[var(--font-display)] text-[26px] font-extrabold tracking-[-0.04em] text-[color:var(--color-ink)]">
            Tipi
          </p>
          <p className="mt-[-2px] text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
            Journal Search
          </p>
        </div>
      ) : null}
    </div>
  );
}
