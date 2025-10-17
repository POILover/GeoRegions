import { shuffle } from "./common";
export interface TestMessage {
  threshold: number;
  messages: string[];
}
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