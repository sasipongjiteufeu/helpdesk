import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { cx } from "./helpdesk-ui";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-4xl",
};

export default function RatingStars({
  value,
  onChange,
  readonly = false,
  size = "md",
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const activeRating = hoverRating || value;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="เลือกคะแนนดาว"
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isActive = starIndex <= activeRating;
        return (
          <button
            key={starIndex}
            type="button"
            disabled={readonly}
            onMouseEnter={() => {
              if (!readonly) setHoverRating(starIndex);
            }}
            onFocus={() => {
              if (!readonly) setHoverRating(starIndex);
            }}
            onClick={() => {
              if (!readonly) onChange?.(starIndex);
            }}
            className={cx(
              "rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-yellow-300",
              sizeClasses[size],
              isActive
                ? "text-yellow-400 [&>svg]:fill-yellow-400"
                : "text-slate-300 [&>svg]:fill-slate-300",
              readonly ? "cursor-default" : "hover:scale-105",
            )}
            aria-label={`ให้คะแนน ${starIndex} ดาว`}
            aria-pressed={value === starIndex}
          >
            <FaStar />
          </button>
        );
      })}
    </div>
  );
}
