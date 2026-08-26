import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  className?: string;
  imgClassName?: string;
};

export function Logo({ variant = "full", className, imgClassName }: LogoProps) {
  const src = variant === "mark" ? "/softsove-mark.png" : "/softsove-logo.png";

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={src}
        alt="Softsove"
        className={cn("h-full w-auto max-w-full object-contain object-left mix-blend-screen", imgClassName)}
      />
    </div>
  );
}
