type GermanySilhouetteProps = {
  className?: string;
  fill?: string;
};

/** Simplified Germany silhouette aligned to star-map projection space (0–100). */
export default function GermanySilhouette({
  className,
  fill = "#163D3B",
}: GermanySilhouetteProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        fill={fill}
        d="
          M 10 18
          L 22 10
          L 38 8
          L 54 10
          L 68 14
          L 82 22
          L 90 34
          L 92 48
          L 88 62
          L 78 74
          L 64 84
          L 48 90
          L 32 88
          L 20 78
          L 12 64
          L 8 48
          L 8 32
          Z
        "
      />
    </svg>
  );
}
