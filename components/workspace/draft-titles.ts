import { isTripPurpose, TRIP_PURPOSES } from "../../lib/workspace/draft-start";
import { validDate } from "../../lib/workspace/model";
import { formatDate } from "./editor-types";

type DraftTrip = { id: string; createdAt: Date; purpose: string; arrivalDate: string; departureDate: string };

function tripTitle(draft: DraftTrip) {
  const purpose = isTripPurpose(draft.purpose) ? TRIP_PURPOSES[draft.purpose] : "赴澳行程";
  const hasArrival = validDate(draft.arrivalDate);
  const date = hasArrival ? draft.arrivalDate : draft.departureDate;
  if (hasArrival || validDate(date)) {
    const [year, month] = date.split("-");
    return `${purpose} · ${year}年${Number(month)}月${hasArrival ? "赴澳" : "离澳"}`;
  }
  return `${purpose} · ${formatDate(draft.createdAt, true)} 创建`;
}

export function draftTitles(drafts: DraftTrip[]) {
  const groups = new Map<string, DraftTrip[]>();
  for (const draft of drafts) {
    const title = tripTitle(draft);
    const group = groups.get(title);
    if (group) group.push(draft);
    else groups.set(title, [draft]);
  }

  const titles = new Map<string, string>();
  for (const [title, group] of groups) {
    group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    group.forEach((draft, index) => titles.set(draft.id, group.length === 1 ? title : `${title}（${index + 1}）`));
  }
  return titles;
}
