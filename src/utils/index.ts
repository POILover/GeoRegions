import mapSvg from "../assets/counties.svg?raw";

const STORAGE_KEY = "county-quiz-stats-v1";

// 类型定义
export interface CountyStats {
    seen: number;
    correct: number;
    wrong: number;
}

export interface StatsData {
    [county: string]: CountyStats;
}

export interface WeightedCounty {
    county: string;
    weight: number;
}

export interface TestMessage {
    threshold: number;
    messages: string[];
}

// get counties from the SVG content
const extractCountiesFromSvg = (svgContent: string): string[] => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const countiesGroup = svgDoc.querySelector('g#counties');
    const pathElements = countiesGroup?.querySelectorAll('path[id]');
    // TODO: hasIgnore name__language 
    const counties = Array.from(pathElements || [])
        .map(path => path.getAttribute('id'))
        .filter((id): id is string => id !== null);
    return counties;
};

// 动态生成的县列表
export const COUNTIES = extractCountiesFromSvg(mapSvg);
export const COUNTY_SET = new Set(COUNTIES);
export const TOTAL_COUNTIES = COUNTIES.length;

const defaultStats: CountyStats = { seen: 0, correct: 0, wrong: 0 };

export const ensureStats = (stats: StatsData, county: string): CountyStats => {
    return stats[county] ?? { ...defaultStats };
};

export const loadStats = (): StatsData => {
    if (typeof window === "undefined") {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === "object") ? parsed : {};
    } catch {
        return {};
    }
};

export const persistStats = (stats: StatsData): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const weightForCounty = (stats: StatsData, county: string, previous?: string): number => {
    const entry = ensureStats(stats, county);
    const attempts = entry.correct + entry.wrong;
    const seen = entry.seen;
    if (attempts === 0) {
        return 6.5;
    }
    const missRate = entry.wrong / attempts;
    const freshnessBoost = 1 / (seen + 1);
    let weight = 1 + missRate * 4 + freshnessBoost;
    if (seen === 0) {
        weight += 0.4;
    }
    if (previous && county === previous) {
        weight *= 0.6;
    }
    return weight;
};

export const pickNextCounty = (stats: StatsData, previous?: string): string => {
    const weighted: WeightedCounty[] = COUNTIES.map((county) => ({
        county,
        weight: weightForCounty(stats, county, previous),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    for (const { county, weight } of weighted) {
        threshold -= weight;
        if (threshold <= 0) {
            return county;
        }
    }
    // 确保总是返回一个县
    return weighted[weighted.length - 1]?.county || COUNTIES[0]!;
};

export const applyNextCounty = (stats: StatsData, nextCounty: string): { stats: StatsData; currentCounty: string } => {
    const nextEntry = ensureStats(stats, nextCounty);
    const statsWithSeen = {
        ...stats,
        [nextCounty]: {
            ...nextEntry,
            seen: nextEntry.seen + 1,
        },
    };
    persistStats(statsWithSeen);
    return { stats: statsWithSeen, currentCounty: nextCounty };
};

export const advanceCounty = (stats: StatsData, previousCounty?: string): { stats: StatsData; currentCounty: string } => {
    const nextCounty = pickNextCounty(stats, previousCounty);
    return applyNextCounty(stats, nextCounty);
};

const shuffle = <T>(values: T[]): T[] => {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const holder = copy[index]!;
        copy[index] = copy[swapIndex]!;
        copy[swapIndex] = holder;
    }
    return copy;
};

export const formatDuration = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const TEST_MESSAGES: TestMessage[] = [
    {
        threshold: 100,
        messages: [
            "You're flawless!",
            "Absolute county wizard!",
            "Every county bows to you.",
            "Perfection achieved. Frame this moment.",
            "Cartographic superstar!",
            "Nothing left to teach you—take a bow.",
        ],
    },
    {
        threshold: 95,
        messages: [
            "Sublime geography skills!",
            "Nearly perfect—bragging rights earned.",
            "Counties fear your insight.",
            "So close to perfect—brilliant work!",
            "County encyclopedia unlocked.",
            "If this were darts, you’d be on a nine-darter.",
        ],
    },
    {
        threshold: 85,
        messages: [
            "Great job!",
            "The counties are proud of you.",
            "You’re on a roll—keep going!",
            "A+ on the atlas quiz!",
            "County compass pointing true north.",
            "Bring this energy to the next round.",
        ],
    },
    {
        threshold: 70,
        messages: [
            "Solid work!",
            "Nice effort—one more round?",
            "County compass mostly on point.",
            "You’re warming up the map nicely.",
            "Stick with it—victory is circling.",
            "Momentum is on your side.",
        ],
    },
    {
        threshold: 50,
        messages: [
            "Room to grow, but you’re getting there!",
            "Counties are tricky—keep practicing!",
            "Not bad—ready for a rematch?",
            "Your map sense is waking up.",
            "Give it another spin—progress incoming.",
            "You’re halfway to hero status.",
        ],
    },
    {
        threshold: 0,
        messages: [
            "Tough run—give it another go!",
            "Counties can be stubborn—try again!",
            "Every miss is a step closer to mastery.",
            "Maps are tricky—today was recon.",
            "Shake it off—next run will sparkle.",
            "The counties won this round—demand a rematch.",
        ],
    },
];

export const pickTestMessage = (percent: number): string => {
    for (const bucket of TEST_MESSAGES) {
        if (percent >= bucket.threshold) {
            const rotations = shuffle(bucket.messages);
            return rotations[0]!;
        }
    }
    return "Great effort!";
};

export const createInitialState = (): { stats: StatsData; currentCounty: string } => {
    const baseStats = loadStats();
    return advanceCounty(baseStats, undefined);
};