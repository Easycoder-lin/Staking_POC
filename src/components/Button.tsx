import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

const buttonVariantsConfig = {
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-paper transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed active:scale-[0.98]",
  variants: {
    variant: {
      primary: "bg-ink text-white hover:bg-ink/90 active:bg-ink/80 disabled:bg-line disabled:text-ink/45",
      secondary: "border border-line bg-white text-ink hover:border-sky hover:bg-sky/5 active:bg-sky/10 disabled:border-line disabled:bg-paper disabled:text-ink/45",
      ghost: "text-ink hover:bg-ink/5 active:bg-ink/10 disabled:text-ink/45",
    },
    size: {
      default: "h-10 px-4",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariantsConfig.variants.variant;
  size?: keyof typeof buttonVariantsConfig.variants.size;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  const variantClass = buttonVariantsConfig.variants.variant[variant || buttonVariantsConfig.defaultVariants.variant];
  const sizeClass = buttonVariantsConfig.variants.size[size || buttonVariantsConfig.defaultVariants.size];

  return (
    <button className={twMerge(buttonVariantsConfig.base, variantClass, sizeClass, className)} ref={ref} {...props} />
  );
});
Button.displayName = "Button";

export { Button };
