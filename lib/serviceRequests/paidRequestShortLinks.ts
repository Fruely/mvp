import type { PaidRequestUtm } from "./paidRequestEntry";

export const NEMETSKIE_MUSLI_SHORT_PATH = "/go/muesli";
export const NEMETSKIE_MUSLI_SHORT_URL = `https://freuly.de${NEMETSKIE_MUSLI_SHORT_PATH}`;

export const NEMETSKIE_MUSLI_UTM: PaidRequestUtm = {
  utm_source: "nemetskie_musli",
  utm_medium: "telegram",
  utm_campaign: "client_demand_launch",
  utm_content: "sponsored_post",
};
