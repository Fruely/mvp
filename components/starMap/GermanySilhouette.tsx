import { GERMANY_SILHOUETTE_PATH } from "@/lib/starMap/germanySilhouettePath.mjs";

export const GERMANY_SILHOUETTE_VIEWBOX = "0 0 500 500";
export { GERMANY_SILHOUETTE_PATH };

type GermanySilhouettePathProps = {
  fill?: string;
};

/** Path only — must be rendered inside the shared 500×500 star-map SVG. */
export default function GermanySilhouettePath({
  fill = "#163D3B",
}: GermanySilhouettePathProps) {
  return <path fill={fill} d={GERMANY_SILHOUETTE_PATH} />;
}
