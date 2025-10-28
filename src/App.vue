<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, reactive } from 'vue'
import { formatDuration, shuffle } from './utils/common'
import { useGroup } from './utils/hooks/group'
import { useStats } from './utils/hooks/stats'
import { GROUP_IDS } from './utils/group'
import { useDivision } from './utils/hooks/division'
import { ensureStats, type StatsData } from './utils/stats'
import { pickTestMessage } from './utils/test'
import type { DivisionId, GroupId } from './types'
import { calculateNextDivision } from './utils/division'
// 类型定义
interface AppState {
  stats: StatsData
  currentDivision: DivisionId
}

type FeedBack = {
  text: string
  type: 'success' | 'error' | null
}

interface TestResultType {
  correct: number
  total: number
  percent: number
  durationMs: number
}

interface RevealedRef {
  node: Element | null
  originalStyle: string
}

const { DIVISION_IDS, TOTAL_DIVISIONS, getDivisionNameById } = useDivision()
const { loadStats, setStats } = useStats()
const createInitialState = (): AppState => {
	const baseStats = loadStats();
	return advanceDivision(baseStats, undefined);
};

// 响应式状态变量
const state = ref<AppState>(createInitialState())
const feedback = reactive<FeedBack>({text: "", type: null})
const selectedDivision = ref<DivisionId | null>(null)
const isRevealed = ref(false)
const isStatsOpen = ref(false)
const isTestMode = ref(false)
const testQueue = ref<DivisionId[]>([])
const testCorrect = ref(0)
const testStartTime = ref<number | null>(null)
const testResult = ref<TestResultType | null>(null)

// DOM 引用
const svgRef = ref<HTMLElement | null>(null)
const actionButtonRef = ref<HTMLElement | null>(null)

// 其他 ref
const revealedRef = ref<RevealedRef | null>(null)
const statsHistoryFlag = ref(false)

// 计算属性
const testQueueLength = computed(() => testQueue.value.length)

const testProgressPercent = computed(() => {
  const completedTestCount = TOTAL_DIVISIONS.value - testQueueLength.value
  const rawTestProgress = (isTestMode.value && TOTAL_DIVISIONS.value > 0)
    ? Math.round((completedTestCount / TOTAL_DIVISIONS.value) * 100)
    : 0
  return Math.min(100, Math.max(0, rawTestProgress))
})
const testButtonLabel = computed(() => isTestMode.value ? "Cancel" : "Test me")

const testMessage = computed(() => {
  if (!testResult.value) return ""
  return pickTestMessage(testResult.value.percent)
})

const testScoreLabel = computed(() => 
  testResult.value ? `${testResult.value.correct} / ${testResult.value.total}` : ""
)

const testDurationLabel = computed(() => 
  testResult.value ? formatDuration(testResult.value.durationMs) : ""
)

const currentDivision = computed(() => state.value.currentDivision)
const stats = computed(() => state.value.stats)

const statsEntries = computed(() => {
  return [... DIVISION_IDS.value]
    .map((division) => {
      const entry = ensureStats(stats.value, division)
      const attempts = entry.correct + entry.wrong
      const percent = attempts === 0 ? 0 : Math.round((entry.correct / attempts) * 100)
      return {
        division,
        percent,
        attempts,
        correct: entry.correct,
        seen: entry.seen,
      }
    })
})
const { currentSvgMap, currentGroupId, getGroupNameById, setCurrentGroupId } = useGroup()

// 方法定义
const applyNextDivision = (stats: StatsData, nextDivision: DivisionId): { stats: StatsData; currentDivision: DivisionId } => {
  const nextEntry = ensureStats(stats, nextDivision);
  const statsWithSeen = {
    ...stats,
    [nextDivision]: {
      ...nextEntry,
      seen: nextEntry.seen + 1,
    },
  };
  setStats(statsWithSeen);
  return { stats: statsWithSeen, currentDivision: nextDivision };
};

const advanceDivision = (stats: StatsData, previousDivision?: DivisionId): { stats: StatsData; currentDivision: DivisionId } => {
  const nextDivision = calculateNextDivision(DIVISION_IDS.value, stats, previousDivision);
  return applyNextDivision(stats, nextDivision);
};

const clearHighlights = () => {
  const container = svgRef.value
  if (!container) return
  container
    .querySelectorAll(".is-selected, .is-last-clicked, .is-revealed")
    .forEach((node) =>
      node.classList.remove("is-selected", "is-last-clicked", "is-revealed")
    )
  const revealed = revealedRef.value
  if (revealed?.node?.isConnected) {
    if (revealed.originalStyle != null) {
      if (revealed.originalStyle.length > 0) {
        revealed.node.setAttribute("style", revealed.originalStyle)
      } else {
        revealed.node.removeAttribute("style")
      }
    }
  }
  revealedRef.value = null
}

// 自动居中与规范化 SVG：设置 viewBox 和 preserveAspectRatio
const normalizeAndCenterSvg = () => {
  const container = svgRef.value
  if (!container) return
  const svg = container.querySelector('svg') as SVGSVGElement | null
  if (!svg) return
  const main = svg.querySelector('g#main') as unknown as SVGGraphicsElement | null
  try {
    const target = (main ?? (svg as unknown as SVGGraphicsElement))
    const bbox = target.getBBox()
    const padding = Math.max(0, Math.min(bbox.width, bbox.height) * 0.02)
    const x = bbox.x - padding
    const y = bbox.y - padding
    const width = bbox.width + padding * 2
    const height = bbox.height + padding * 2
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.removeAttribute('width')
    svg.removeAttribute('height')
  } catch (e) {
    console.warn('[map] Failed to center SVG', e)
  }
}

const focusActionButton = () => {
  const node = actionButtonRef.value
  if (!node) return
  node.focus()
}

const finishTest = (finalCorrect: number, options: { skipAdvance?: boolean } = {}) => {
  const { skipAdvance = false } = options
  const durationMs = testStartTime.value ? Date.now() - testStartTime.value : 0
  clearHighlights()
  isTestMode.value = false
  testQueue.value = []
  testStartTime.value = null
  testCorrect.value = finalCorrect
  const percent = TOTAL_DIVISIONS.value === 0 ? 0 : Math.round((finalCorrect / TOTAL_DIVISIONS.value) * 100)
  testResult.value = {
    correct: finalCorrect,
    total: TOTAL_DIVISIONS.value,
    percent,
    durationMs,
  }
  isRevealed.value = false
  feedback.text = ""
  feedback.type = null
  selectedDivision.value = null
  if (!skipAdvance) {
    state.value = advanceDivision(state.value.stats, state.value.currentDivision)
  }
}

const handleCorrect = (division: DivisionId) => {
  const divisionStats = ensureStats(state.value.stats, division)
  const updatedStats = {
    ...state.value.stats,
    [division]: {
      ...divisionStats,
      correct: divisionStats.correct + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentDivision: state.value.currentDivision }
  
  if (isTestMode.value) {
    testCorrect.value++
    if (testQueueLength.value <= 1) {
      finishTest(testCorrect.value)
      return
    }
  }
  feedback.text = "Correct!"
  feedback.type = "success"
  isRevealed.value = true
}

const handleIncorrect = (division: DivisionId, guess: DivisionId) => {
  const divisionStats = ensureStats(state.value.stats, division)
  const updatedStats = {
    ...state.value.stats,
    [division]: {
      ...divisionStats,
      wrong: divisionStats.wrong + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentDivision: state.value.currentDivision }
  
  if (isTestMode.value && testQueueLength.value <= 1) {
    finishTest(testCorrect.value)
    return
  }
  feedback.text = `That was ${getDivisionNameById(guess)}. Try again.`
  feedback.type = "error"
  isRevealed.value = false
}

const getDivisionPath = (divisionId: string): Element | null => {
  if (!divisionId) return null
  const container = svgRef.value
  if (!container) return null
  const escape = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape
    : (value: string) => value.replace(/["\\]/g, "\\$&")
  const node = container.querySelector(`[id="${escape(divisionId)}"]`)
  if (!node) {
    console.warn(`[map] Division path not found for id: ${divisionId}`)
  }
  return node
}

const startTestMode = () => {
  const order = shuffle(DIVISION_IDS.value)
  if (order.length === 0) return
  clearHighlights()
  if (isStatsOpen.value) {
    statsHistoryFlag.value = false
    isStatsOpen.value = false
  }
  isTestMode.value = true
  testQueue.value = order
  testCorrect.value = 0
  testStartTime.value = Date.now()
  testResult.value = null
  selectedDivision.value = null
  feedback.text = ""
  feedback.type = null
  isRevealed.value = false
  state.value = applyNextDivision(state.value.stats, order[0]!)
}

const cancelTestMode = () => {
  clearHighlights()
  isTestMode.value = false
  testQueue.value = []
  testCorrect.value = 0
  testStartTime.value = null
  testResult.value = null
  selectedDivision.value = null
  feedback.text = ""
  feedback.type = null
  isRevealed.value = false
  state.value = advanceDivision(state.value.stats, state.value.currentDivision)
}

const handleTestButton = () => {
  if (isTestMode.value) {
    cancelTestMode()
  } else {
    startTestMode()
  }
}

const closeTestResult = () => {
  testResult.value = null
  testCorrect.value = 0
  testQueue.value = []
  testStartTime.value = null
  selectedDivision.value = null
}

const openStats = () => {
  if (isStatsOpen.value) return
  if (typeof window !== "undefined") {
    statsHistoryFlag.value = true
    window.history.pushState({ modal: "stats" }, "")
  } else {
    statsHistoryFlag.value = false
  }
  isStatsOpen.value = true
}

const closeStats = (options: { skipHistory?: boolean } = {}) => {
  const { skipHistory = false } = options
  if (!isStatsOpen.value) return
  isStatsOpen.value = false
  if (!skipHistory && statsHistoryFlag.value && typeof window !== "undefined") {
    statsHistoryFlag.value = false
    window.history.back()
  }
}

const handleMapClick = (event: Event) => {
  const target = event.target as Element
  const path = target.closest("path")
  if (!path) return
  const guess = path.id as DivisionId
  if (!DIVISION_IDS.value.includes(guess)) return
  focusActionButton()
  
  if (isRevealed.value) {
    const container = svgRef.value
    if (container) {
      container.querySelectorAll(".is-last-clicked").forEach((node) => {
        node.classList.remove("is-last-clicked")
      })
    }
    if (guess === currentDivision.value) {
      selectedDivision.value = null
    } else {
      selectedDivision.value = guess
    }
    path.classList.add("is-last-clicked")
    return
  }
  
  clearHighlights()
  path.classList.add("is-last-clicked")
  if (!currentDivision.value) return
  if (guess === currentDivision.value) {
    selectedDivision.value = null
    path.classList.remove("is-last-clicked")
    path.classList.add("is-selected")
    handleCorrect(currentDivision.value)
  } else {
    selectedDivision.value = null
    handleIncorrect(currentDivision.value, guess)
  }
}

const handleShowOrNext = () => {
  if (!currentDivision.value) return
  if (isRevealed.value) {
    clearHighlights()
    if (isTestMode.value) {
      if (testQueueLength.value <= 1) {
        finishTest(testCorrect.value)
      } else {
        const remaining = testQueue.value.slice(1)
        const nextDivision = remaining[0]!
        testQueue.value = remaining
        state.value = applyNextDivision(state.value.stats, nextDivision)
        isRevealed.value = false
        feedback.text = ""
        feedback.type = null
        selectedDivision.value = null
      }
      return
    }
    state.value = advanceDivision(state.value.stats, state.value.currentDivision)
    isRevealed.value = false
    feedback.text = ""
    feedback.type = null
    selectedDivision.value = null
    return
  }
  
  const currentStats = ensureStats(state.value.stats, currentDivision.value)
  const updatedStats = {
    ...state.value.stats,
    [currentDivision.value]: {
      ...currentStats,
      wrong: currentStats.wrong + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentDivision: state.value.currentDivision }
  
  clearHighlights()
  feedback.text = ""
  feedback.type = null
  const target = getDivisionPath(currentDivision.value)
  if (target) {
    const originalStyle = target.getAttribute("style") ?? ""
    revealedRef.value = { node: target, originalStyle }
    const styleMap = originalStyle
      .split(";")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .reduce((acc: Record<string, string>, segment) => {
        const [key, value] = segment.split(":")
        if (key && value) {
          acc[key.trim()] = value.trim()
        }
        return acc
      }, {})
    styleMap.fill = "#e91e63"
    styleMap.stroke = "#880e4f"
    styleMap["stroke-width"] = "1.6"
    const nextStyle = Object.entries(styleMap)
      .map(([key, value]) => `${key}:${value}`)
      .join(";")
    target.setAttribute("style", nextStyle)
    target.classList.add("is-revealed")
    console.debug(`[map] Revealed ${currentDivision.value}`)
    selectedDivision.value = null
    isRevealed.value = true
  }
}

// 生命周期和监听
onMounted(() => {
  const container = svgRef.value
  if (!container) return
  if (container.childElementCount === 0) {
    container.innerHTML = currentSvgMap.value
  }
  // 注入后进行规范化与自动居中
  normalizeAndCenterSvg()
})

// 监听器
watch(currentDivision, () => {
  clearHighlights()
  isRevealed.value = false
  feedback.text = ""
  feedback.type = null
  selectedDivision.value = null
})

// 浏览器历史处理
onMounted(() => {
  if (typeof window === "undefined") return
  const handlePop = () => {
    if (isStatsOpen.value) {
      statsHistoryFlag.value = false
      closeStats({ skipHistory: true })
    }
  }
  window.addEventListener("popstate", handlePop)
  
  onUnmounted(() => {
    window.removeEventListener("popstate", handlePop)
  })
})

// 处理弹窗时的页面滚动
watch(isStatsOpen, (newVal) => {
  if (typeof document === "undefined") return
  if (newVal) {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    
    onUnmounted(() => {
      document.body.style.overflow = previousOverflow
    })
  }
})
</script>

<template>
  <div :class="['app', { 'app--test': isTestMode }]">
    <div v-if="isTestMode" class="test-progress" role="status" aria-live="polite">
      <div class="test-progress__bar">
        <div class="test-progress__fill" :style="{ width: `${testProgressPercent}%` }" />
        <div class="test-progress__label">{{ testProgressPercent }}% complete</div>
      </div>
    </div>
    
    <header class="app__header">
      <div class="app__header-top">
        <h1 class="app__title">Where is {{ getDivisionNameById(currentDivision) }}?</h1>
        <div v-if="!isTestMode && false" class="group-selector">
          <select 
            :value="currentGroupId" 
            @change="(e) => setCurrentGroupId((e.target as HTMLSelectElement).value as GroupId)"
            class="group-selector__select"
          >
            <option 
              v-for="groupId in GROUP_IDS" 
              :key="groupId" 
              :value="groupId"
            >
              {{ getGroupNameById(groupId) }}
            </option>
          </select>
        </div>
      </div>
      <div class="app__header-message" aria-live="polite">
        <span v-if="isRevealed && selectedDivision" class="app__header-label">{{ getDivisionNameById(selectedDivision) }}</span>
        <p v-else-if="feedback.text" :class="['app__feedback', feedback.type && `app__feedback--${feedback.type}`]">
          {{ feedback.text }}
        </p>
      </div>
    </header>
    
    <main class="app__main">
      <div class="map-container">
        <div ref="svgRef" class="map" @click="handleMapClick" />
      </div>
    </main>
    
    <footer class="app__footer">
      <button type="button" class="footer-button footer-button--stats" @click="openStats">
        Stats
      </button>
      <button type="button" class="footer-button footer-button--test" @click="handleTestButton">
        {{ testButtonLabel }}
      </button>
      <button
        ref="actionButtonRef"
        type="button"
        class="footer-button footer-button--action"
        @click="handleShowOrNext"
      >
        {{ isRevealed ? "Next" : "Show" }}
      </button>
    </footer>
    
    <div
      v-if="testResult"
      class="stats-overlay test-result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-result-title"
      aria-describedby="test-result-message"
      @click="closeTestResult"
    >
      <div class="test-modal" @click.stop>
        <button 
          type="button" 
          class="test-modal__close" 
          aria-label="Close test results" 
          @click="closeTestResult"
        >
          ×
        </button>
        <div class="test-modal__icon" aria-hidden="true">🎉</div>
        <h2 id="test-result-title" class="test-modal__title">Test complete!</h2>
        <p class="test-modal__score">{{ testScoreLabel }}</p>
        <p class="test-modal__percent">{{ testResult.percent }}% correct</p>
        <p id="test-result-message" class="test-modal__message">{{ testMessage }}</p>
        <p class="test-modal__meta">Time: {{ testDurationLabel }}</p>
        <div class="test-modal__actions">
          <button type="button" class="test-modal__button" @click="closeTestResult">
            Close
          </button>
          <button 
            type="button" 
            class="test-modal__button test-modal__button--secondary" 
            @click="() => { closeTestResult(); startTestMode(); }"
          >
            Test again
          </button>
        </div>
      </div>
    </div>
    
    <div
      v-if="isStatsOpen"
      class="stats-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
      @click="() => closeStats()"
    >
      <div class="stats-modal" @click.stop>
        <div class="stats-header">
          <h2 id="stats-title">Statistics</h2>
          <button
            type="button"
            class="stats-close"
            aria-label="Close stats"
            @click="() => closeStats()"
          >
            ×
          </button>
        </div>
        <div class="stats-body">
          <div class="stats-grid">
            <div
              v-for="{ division, percent, attempts, correct, seen } in statsEntries"
              :key="division"
              class="stats-row"
            >
              <div class="stats-name">{{ getDivisionNameById(division) }}</div>
              <div class="stats-bar" aria-hidden="true">
                <div
                  :class="['stats-bar-fill', { 'stats-bar-fill--unseen': seen === 0 }]"
                  :style="{ width: `${percent}%` }"
                />
              </div>
              <div class="stats-data">
                {{ percent }}% ({{ correct }}/{{ attempts }})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
