import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateRatingProps {
  rating: number; // 1-10
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "small" | "medium" | "large";
  showNumber?: boolean;
}

export function CandidateRating({
  rating,
  onChange,
  readOnly = false,
  size = "medium",
  showNumber = true,
}: CandidateRatingProps) {
  const totalStars = 10;

  // Color based on rating
  const getRatingColor = (currentRating: number): string => {
    if (currentRating >= 9) return "text-blue-500"; // Excellent
    if (currentRating >= 7) return "text-green-500"; // Good
    if (currentRating >= 4) return "text-yellow-500"; // Average
    return "text-red-500"; // Poor
  };

  const getRatingLabel = (currentRating: number): string => {
    if (currentRating >= 9) return "Excellent";
    if (currentRating >= 7) return "Good";
    if (currentRating >= 4) return "Average";
    return "Poor";
  };

  const starSizes = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
  };

  const handleStarClick = (starRating: number) => {
    if (!readOnly && onChange) {
      onChange(starRating);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalStars }, (_, index) => {
            const starNumber = index + 1;
            const isFilled = starNumber <= rating;

            return (
              <button
                key={starNumber}
                type="button"
                onClick={() => handleStarClick(starNumber)}
                disabled={readOnly}
                className={cn(
                  "transition-all duration-200",
                  !readOnly && "hover:scale-110 cursor-pointer",
                  readOnly && "cursor-default"
                )}
                aria-label={`Rate ${starNumber} out of 10`}
              >
                <Star
                  className={cn(
                    starSizes[size],
                    isFilled ? getRatingColor(rating) : "text-gray-300",
                    isFilled && "fill-current"
                  )}
                />
              </button>
            );
          })}
        </div>

        {showNumber && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-semibold text-lg",
                getRatingColor(rating)
              )}
            >
              {rating}/10
            </span>
            {rating > 0 && (
              <span className={cn(
                "text-sm font-medium px-2 py-0.5 rounded-full",
                getRatingColor(rating),
                "bg-opacity-10",
                rating >= 9 && "bg-blue-100 text-blue-700",
                rating >= 7 && rating < 9 && "bg-green-100 text-green-700",
                rating >= 4 && rating < 7 && "bg-yellow-100 text-yellow-700",
                rating < 4 && "bg-red-100 text-red-700"
              )}>
                {getRatingLabel(rating)}
              </span>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Click on a star to rate (1 = Poor, 10 = Excellent)
        </p>
      )}
    </div>
  );
}
