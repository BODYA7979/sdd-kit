interface StarRatingProps {
  /** 1-5, or a decimal average such as 4.3. */
  rating: number;
  className?: string;
}

/** Read-only star display. The numeric label is what screen readers announce. */
export function StarRating({ rating, className = '' }: StarRatingProps) {
  const filled = Math.round(rating);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={star <= filled ? 'text-amber-500' : 'text-zinc-300'}>
          ★
        </span>
      ))}
    </span>
  );
}
