<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { 
  createInitialState, 
  advanceCounty, 
  ensureStats, 
  applyNextCounty,
  pickTestMessage,
  formatDuration,
  COUNTIES,
  COUNTY_SET,
  TOTAL_COUNTIES,
  groups,
  type StatsData, 
  mapSvg,
  getCountyNameById
} from './utils'
import { setStats } from './utils/stats.ts'
console.log(groups)
// 类型定义
interface AppState {
  stats: StatsData
  currentCounty: string
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



// 响应式状态变量
const state = ref<AppState>(createInitialState())
const feedback = ref("")
const feedbackType = ref<string | null>(null)
const selectedCountyName = ref("")
const isRevealed = ref(false)
const isStatsOpen = ref(false)
const isTestMode = ref(false)
const testQueue = ref<string[]>([])
const testCorrect = ref(0)
const testStartTime = ref<number | null>(null)
const testResult = ref<TestResultType | null>(null)

// DOM 引用
const svgRef = ref<HTMLElement | null>(null)
const actionButtonRef = ref<HTMLElement | null>(null)

// 其他 ref
const revealedRef = ref<RevealedRef | null>(null)
const statsHistoryFlag = ref(false)
const isStatsOpenRef = ref(false)
const testCorrectRef = ref(0)

// 计算属性
const testQueueLength = computed(() => testQueue.value.length)
const completedTestCount = computed(() => TOTAL_COUNTIES - testQueueLength.value)
const rawTestProgress = computed(() => 
  (isTestMode.value && TOTAL_COUNTIES > 0)
    ? Math.round((completedTestCount.value / TOTAL_COUNTIES) * 100)
    : 0
)
const testProgressPercent = computed(() => 
  Math.min(100, Math.max(0, rawTestProgress.value))
)
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

const feedbackNode = computed(() => 
  feedback.value
    ? { 
        text: feedback.value, 
        type: feedbackType.value 
      }
    : null
)



const currentCounty = computed(() => state.value.currentCounty)
const stats = computed(() => state.value.stats)

const statsEntries = computed(() => {
  return [...COUNTIES]
    .map((county) => {
      const entry = ensureStats(stats.value, county)
      const attempts = entry.correct + entry.wrong
      const percent = attempts === 0 ? 0 : Math.round((entry.correct / attempts) * 100)
      return {
        county,
        percent,
        attempts,
        correct: entry.correct,
        seen: entry.seen,
      }
    })
})

// 工具函数
const shuffle = <T>(array: T[]): T[] => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

// 方法定义
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
  testCorrectRef.value = finalCorrect
  testCorrect.value = finalCorrect
  const percent = TOTAL_COUNTIES === 0 ? 0 : Math.round((finalCorrect / TOTAL_COUNTIES) * 100)
  testResult.value = {
    correct: finalCorrect,
    total: TOTAL_COUNTIES,
    percent,
    durationMs,
  }
  isRevealed.value = false
  feedback.value = ""
  feedbackType.value = null
  selectedCountyName.value = ""
  if (!skipAdvance) {
    state.value = advanceCounty(state.value.stats, state.value.currentCounty)
  }
}

const handleCorrect = (county: string) => {
  const countyStats = ensureStats(state.value.stats, county)
  const updatedStats = {
    ...state.value.stats,
    [county]: {
      ...countyStats,
      correct: countyStats.correct + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentCounty: state.value.currentCounty }
  
  if (isTestMode.value) {
    const nextCorrect = testCorrectRef.value + 1
    testCorrectRef.value = nextCorrect
    testCorrect.value = nextCorrect
    if (testQueueLength.value <= 1) {
      finishTest(nextCorrect)
      return
    }
  }
  feedback.value = "Correct!"
  feedbackType.value = "success"
  isRevealed.value = true
}

const handleIncorrect = (county: string, guess: string) => {
  const countyStats = ensureStats(state.value.stats, county)
  const updatedStats = {
    ...state.value.stats,
    [county]: {
      ...countyStats,
      wrong: countyStats.wrong + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentCounty: state.value.currentCounty }
  
  if (isTestMode.value && testQueueLength.value <= 1) {
    finishTest(testCorrectRef.value)
    return
  }
  feedback.value = `That was ${guess}. Try again.`
  feedbackType.value = "error"
  isRevealed.value = false
}

const getCountyPath = (county: string): Element | null => {
  if (!county) return null
  const container = svgRef.value
  if (!container) return null
  const escape = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape
    : (value: string) => value.replace(/["\\]/g, "\\$&")
  const node = container.querySelector(`[id="${escape(county)}"]`)
  if (!node) {
    console.warn(`[map] County path not found for id: ${county}`)
  }
  return node
}

const startTestMode = () => {
  const order = shuffle(COUNTIES)
  if (order.length === 0) return
  clearHighlights()
  if (isStatsOpenRef.value) {
    statsHistoryFlag.value = false
    isStatsOpen.value = false
  }
  isTestMode.value = true
  testQueue.value = order
  testCorrectRef.value = 0
  testCorrect.value = 0
  testStartTime.value = Date.now()
  testResult.value = null
  selectedCountyName.value = ""
  feedback.value = ""
  feedbackType.value = null
  isRevealed.value = false
  state.value = applyNextCounty(state.value.stats, order[0]!)
}

const cancelTestMode = () => {
  clearHighlights()
  isTestMode.value = false
  testQueue.value = []
  testCorrectRef.value = 0
  testCorrect.value = 0
  testStartTime.value = null
  testResult.value = null
  selectedCountyName.value = ""
  feedback.value = ""
  feedbackType.value = null
  isRevealed.value = false
  state.value = advanceCounty(state.value.stats, state.value.currentCounty)
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
  testCorrectRef.value = 0
  testCorrect.value = 0
  testQueue.value = []
  testStartTime.value = null
  selectedCountyName.value = ""
}

const openStats = () => {
  if (isStatsOpenRef.value) return
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
  if (!isStatsOpenRef.value) return
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
  const guess = path.id
  if (!COUNTY_SET.has(guess)) return
  focusActionButton()
  
  if (isRevealed.value) {
    const container = svgRef.value
    if (container) {
      container.querySelectorAll(".is-last-clicked").forEach((node) => {
        node.classList.remove("is-last-clicked")
      })
    }
    if (guess === currentCounty.value) {
      selectedCountyName.value = ""
    } else {
      selectedCountyName.value = guess
    }
    path.classList.add("is-last-clicked")
    return
  }
  
  clearHighlights()
  path.classList.add("is-last-clicked")
  if (!currentCounty.value) return
  if (guess === currentCounty.value) {
    selectedCountyName.value = ""
    path.classList.remove("is-last-clicked")
    path.classList.add("is-selected")
    handleCorrect(currentCounty.value)
  } else {
    selectedCountyName.value = ""
    handleIncorrect(currentCounty.value, guess)
  }
}

const handleShowOrNext = () => {
  if (!currentCounty.value) return
  if (isRevealed.value) {
    clearHighlights()
    if (isTestMode.value) {
      if (testQueueLength.value <= 1) {
        finishTest(testCorrectRef.value)
      } else {
        const remaining = testQueue.value.slice(1)
        const nextCounty = remaining[0]!
        testQueue.value = remaining
        state.value = applyNextCounty(state.value.stats, nextCounty)
        isRevealed.value = false
        feedback.value = ""
        feedbackType.value = null
        selectedCountyName.value = ""
      }
      return
    }
    state.value = advanceCounty(state.value.stats, state.value.currentCounty)
    isRevealed.value = false
    feedback.value = ""
    feedbackType.value = null
    selectedCountyName.value = ""
    return
  }
  
  const currentStats = ensureStats(state.value.stats, currentCounty.value)
  const updatedStats = {
    ...state.value.stats,
    [currentCounty.value]: {
      ...currentStats,
      wrong: currentStats.wrong + 1,
    },
  }
  setStats(updatedStats)
  state.value = { stats: updatedStats, currentCounty: state.value.currentCounty }
  
  clearHighlights()
  feedback.value = ""
  feedbackType.value = null
  const target = getCountyPath(currentCounty.value)
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
    console.debug(`[map] Revealed ${currentCounty.value}`)
    selectedCountyName.value = ""
    isRevealed.value = true
  }
}

// 生命周期和监听
onMounted(() => {
  const container = svgRef.value
  if (!container) return
  if (container.childElementCount === 0) {
    container.innerHTML = mapSvg
  }
})

// 监听器
watch(testCorrect, (newVal) => {
  testCorrectRef.value = newVal
})

watch(isStatsOpen, (newVal) => {
  isStatsOpenRef.value = newVal
})

watch(currentCounty, () => {
  clearHighlights()
  isRevealed.value = false
  feedback.value = ""
  feedbackType.value = null
  selectedCountyName.value = ""
})

// 浏览器历史处理
onMounted(() => {
  if (typeof window === "undefined") return
  const handlePop = () => {
    if (isStatsOpenRef.value) {
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
        <h1 class="app__title">Where is {{ getCountyNameById(currentCounty) }}?</h1>
      </div>
      <div class="app__header-message" aria-live="polite">
        <span v-if="isRevealed && selectedCountyName" class="app__header-label">{{ selectedCountyName }}</span>
        <p v-else-if="feedbackNode" :class="['app__feedback', feedbackNode.type && `app__feedback--${feedbackNode.type}`]">
          {{ feedbackNode.text }}
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
          <h2 id="stats-title">County Stats</h2>
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
              v-for="{ county, percent, attempts, correct, seen } in statsEntries"
              :key="county"
              class="stats-row"
            >
              <div class="stats-name">{{ getCountyNameById(county) }}</div>
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
