import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

const Card = forwardRef<HTMLElement, CardProps>(({ as: Component = "div", className, ...props }, ref) => (
  <Component
    ref={ref}
    className={twMerge(
      "rounded-xl border border-line bg-white p-6 shadow-panel transition-shadow duration-200 ease-in-out hover:shadow-panel-hover",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
