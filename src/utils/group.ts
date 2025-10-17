import { LANGUAGE_KEY, type LanguageCode } from "./language";

export const DEFAULT_CURRENT_GROUP_ID = "../assets/countries/china.svg"; // 向原作者致敬, 默认国家是英国

type GroupId = string; // e.g. "../assets/countries/uk.svg"
type GroupNameRecord = Record<LanguageCode, string | null>;
type DivisionId = string; // e.g. "division_1"
type DivisionNameRecord = Record<LanguageCode, string | null>;

const svgAssets = import.meta.glob("../assets/countries/*.svg", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

const languages = Object.entries(LANGUAGE_KEY).map(([key, v]) => ({
  key: key as LanguageCode,
  suffix: v.suffix,
}));


interface DivisionGroup {
  id: GroupId;
  svg: string;
  hasIgnore: boolean;
  divisions: Record<DivisionId, DivisionNameRecord>;
  name: GroupNameRecord;
}
// parse svg path and content to DivisionGroup
function parseSvgToGroup([svgPath, svgContent]: [string, string]): DivisionGroup | null {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgDom = svgDoc.querySelector("svg");
  if (!svgDom) return null;

  const divisionGroup = svgDoc.querySelector("g#main");
  if (!divisionGroup) return null;

  const pathElements = Array.from(divisionGroup.querySelectorAll("path[id]"));
  if (pathElements.length === 0) return null;

  const filteredPaths = pathElements.filter((p) => !p.hasAttribute("ignore"));
  const hasIgnore = filteredPaths.length < pathElements.length;

  const name = Object.fromEntries(
    languages.map(({ key, suffix }) => [key, svgDom.getAttribute(`name_${suffix}`)])
  ) as Record<LanguageCode, string | null>;
  const divisions = {} as Record<string, Record<LanguageCode, string | null>>;
  filteredPaths.forEach((path) => {
    const id = path.getAttribute("id");
    if (id) {
      const names = Object.fromEntries(
        languages.map(({ key, suffix }) => [key, path.getAttribute(`name_${suffix}`)])
      ) as Record<LanguageCode, string | null>;
      divisions[id] = names;
    }
  })

  return { id: svgPath, svg: svgContent, hasIgnore, divisions, name };
}

// 主流程
export const groups = Object.entries(svgAssets)
  .map(parseSvgToGroup)
  .filter(g => !!g);

export const GROUP_IDS = groups.map((g) => g.id!);