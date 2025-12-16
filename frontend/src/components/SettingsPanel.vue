<template>
  <div class="settings-backdrop" @click.self="$emit('close')">
    <div class="settings-panel">
      <header class="settings-header">
        <h2>Settings</h2>
        <button class="close-button" @click="$emit('close')" aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </header>

      <section class="settings-section">
        <h3>Analysis</h3>
        <div class="radio-group top-radio-group">
          <template v-for="mode in colorModesList" :key="mode.key">
            <label class="radio-label">
              <input
                type="radio"
                name="colorMode"
                :value="mode.key"
                :checked="(preferences.appearance?.colorMode || 'depth') === mode.key"
                @change="setColorMode(mode.key)"
              />
              <span>{{ mode.label }}</span>
            </label>
            <p class="setting-description radio-description">
              {{ getDescription(mode) }}
            </p>
            <!-- Timeframe selector for activity mode -->
            <div v-if="mode.key === 'activity' && showTimeframeSelector" class="timeframe-selector">
              <span class="timeframe-label">Time range:</span>
              <div class="timeframe-buttons">
                <button
                  v-for="option in timeframeOptions"
                  :key="option.value"
                  :class="['timeframe-button', { active: (preferences.appearance?.activityTimeframe || '1year') === option.value }]"
                  @click="setActivityTimeframe(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section class="settings-section">
        <h3>Appearance</h3>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="preferences.appearance?.cushionTreemap"
            @change="toggleCushion"
          />
          <span>Enable 3D cushion effect</span>
        </label>
        <p class="setting-description">
          Adds visual depth to treemap cells using gradient shading.
        </p>

        <label class="checkbox-label sub-option" :class="{ disabled: !preferences.appearance?.cushionTreemap }">
          <input
            type="checkbox"
            :checked="preferences.appearance?.hideFolderBorders"
            :disabled="!preferences.appearance?.cushionTreemap"
            @change="toggleHideFolderBorders"
          />
          <span>Hide folder borders</span>
        </label>
        <p class="setting-description sub-description">
          Removes stroke borders from directories, relying on cushion shading for separation.
        </p>

        <label class="checkbox-label" style="margin-top: 16px;">
          <input
            type="checkbox"
            :checked="preferences.appearance?.showRepoBorders"
            @change="toggleShowRepoBorders"
          />
          <span>Show repository borders</span>
        </label>
        <p class="setting-description">
          Highlights git repository boundaries with a distinct border color.
        </p>
      </section>

      <section class="settings-section">
        <h3>Filters</h3>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="preferences.filters?.hideClocignore"
            @change="toggleHideClocignore"
          />
          <span>Hide .clocignore files</span>
        </label>
        <p class="setting-description">
          Exclude files matching patterns in .clocignore from visualization and stats.
        </p>
      </section>

      <section class="settings-section">
        <h3>Custom Exclusions</h3>

        <div class="exclusion-list">
          <div v-if="customExclusions.length === 0" class="empty-state">
            No custom exclusions
          </div>
          <div v-for="excl in customExclusions" :key="excl.pattern" class="exclusion-item">
            <input
              type="checkbox"
              :checked="excl.enabled"
              @change="handleToggleExclusion(excl.pattern)"
            />
            <input
              type="text"
              class="pattern-input"
              :value="excl.pattern"
              @blur="handleUpdateExclusion(excl.pattern, $event.target.value)"
              @keydown.enter="$event.target.blur()"
              @wheel="scrollInput"
            />
            <button class="remove-button" @click="handleRemoveExclusion(excl.pattern)">
              &times;
            </button>
          </div>
        </div>

        <div class="add-exclusion">
          <input
            v-model="newPattern"
            placeholder="Add pattern..."
            @keydown.enter="handleAddExclusion"
          />
          <button @click="handleAddExclusion">Add</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePreferences } from '../composables/usePreferences'
import { COLOR_MODES } from '../utils/colorUtils'

const emit = defineEmits(['close'])

const { preferences, updateURL, addExclusion, removeExclusion, toggleExclusion, updateExclusion } = usePreferences()

const newPattern = ref('')

const customExclusions = computed(() => {
  return preferences.value.filters?.customExclusions || []
})

// Ordered list of color modes for radio buttons
const colorModesList = computed(() => {
  return ['depth', 'filetype', 'activity'].map(key => COLOR_MODES[key])
})

// Timeframe options for activity mode
const timeframeOptions = [
  { value: '3months', label: '3 months' },
  { value: '1year', label: '1 year' }
]

// Whether to show timeframe selector (only when activity mode is selected)
const showTimeframeSelector = computed(() => {
  return (preferences.value.appearance?.colorMode || 'depth') === 'activity'
})

// Get description for a color mode, with dynamic text for activity mode
function getDescription(mode) {
  if (mode.key === 'activity') {
    const timeframe = preferences.value.appearance?.activityTimeframe || '1year'
    const timeframeLabel = timeframe === '3months' ? '3 months' : 'year'
    return `Shows file changes in last ${timeframeLabel}.`
  }
  return mode.description
}

function handleAddExclusion() {
  if (newPattern.value.trim()) {
    addExclusion(newPattern.value.trim())
    newPattern.value = ''
  }
}

function handleRemoveExclusion(pattern) {
  removeExclusion(pattern)
}

function handleToggleExclusion(pattern) {
  toggleExclusion(pattern)
}

function handleUpdateExclusion(oldPattern, newPattern) {
  if (newPattern.trim() && newPattern !== oldPattern) {
    updateExclusion(oldPattern, newPattern)
  }
}

function scrollInput(event) {
  const input = event.target
  input.scrollLeft += event.deltaX + event.deltaY
  event.preventDefault()
}

function toggleCushion(event) {
  if (!preferences.value.appearance) {
    preferences.value.appearance = {}
  }
  preferences.value.appearance.cushionTreemap = event.target.checked
  updateURL()
}

function toggleHideFolderBorders(event) {
  if (!preferences.value.appearance) {
    preferences.value.appearance = {}
  }
  preferences.value.appearance.hideFolderBorders = event.target.checked
  updateURL()
}

function setColorMode(mode) {
  if (!preferences.value.appearance) {
    preferences.value.appearance = {}
  }
  preferences.value.appearance.colorMode = mode
  updateURL()
}

function toggleShowRepoBorders(event) {
  if (!preferences.value.appearance) {
    preferences.value.appearance = {}
  }
  preferences.value.appearance.showRepoBorders = event.target.checked
}

function toggleHideClocignore(event) {
  if (!preferences.value.filters) {
    preferences.value.filters = {}
  }
  preferences.value.filters.hideClocignore = event.target.checked
}

function setActivityTimeframe(timeframe) {
  if (!preferences.value.appearance) {
    preferences.value.appearance = {}
  }
  preferences.value.appearance.activityTimeframe = timeframe
}
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings-panel {
  background: #2a2a2a;
  border: 1px solid #3e3e3e;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #3e3e3e;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #d4d4d4;
}

.close-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  color: #d4d4d4;
  background: #3e3e3e;
}

.settings-section {
  padding: 16px 20px;
}

.settings-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #d4d4d4;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4fc3f7;
}

.checkbox-label.sub-option {
  margin-top: 12px;
  margin-left: 28px;
}

.checkbox-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label.disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.setting-description.sub-description {
  margin-left: 56px;
}

.setting-description {
  margin: 8px 0 0 28px;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.radio-group {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #3e3e3e;
}

.radio-group.top-radio-group {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.radio-group-label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  color: #888;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #d4d4d4;
  margin-bottom: 8px;
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4fc3f7;
}

.setting-description.radio-description {
  margin: 4px 0 0 28px;
}

.timeframe-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 12px 28px;
}

.timeframe-label {
  font-size: 12px;
  color: #888;
}

.timeframe-buttons {
  display: flex;
  gap: 4px;
}

.timeframe-button {
  padding: 4px 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.timeframe-button:hover {
  border-color: #4fc3f7;
  color: #d4d4d4;
}

.timeframe-button.active {
  background: #4fc3f7;
  border-color: #4fc3f7;
  color: #1e1e1e;
}

.exclusion-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  padding: 8px;
}

.exclusion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #3e3e3e;
}

.exclusion-item:last-child {
  border-bottom: none;
}

.exclusion-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #4fc3f7;
  flex-shrink: 0;
}

.exclusion-item .pattern-input {
  flex: 1;
  font-size: 13px;
  font-family: monospace;
  color: #d4d4d4;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 4px 6px;
  min-width: 0;
}

.exclusion-item .pattern-input:hover {
  background: #1e1e1e;
  border-color: #3e3e3e;
}

.exclusion-item .pattern-input:focus {
  background: #1e1e1e;
  border-color: #4fc3f7;
  outline: none;
}

.exclusion-item .remove-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
  padding: 0 4px;
  line-height: 1;
}

.exclusion-item .remove-button:hover {
  color: #ff6b6b;
}

.empty-state {
  color: #888;
  font-size: 13px;
  text-align: center;
  padding: 12px;
}

.add-exclusion {
  display: flex;
  gap: 8px;
}

.add-exclusion input {
  flex: 1;
  padding: 8px 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 13px;
  font-family: monospace;
}

.add-exclusion input:focus {
  outline: none;
  border-color: #4fc3f7;
}

.add-exclusion button {
  padding: 8px 16px;
  background: #3e3e3e;
  border: none;
  border-radius: 4px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 13px;
}

.add-exclusion button:hover {
  background: #4fc3f7;
  color: #1e1e1e;
}
</style>
