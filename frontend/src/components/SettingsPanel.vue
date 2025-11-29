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

        <div class="radio-group">
          <span class="radio-group-label">Color mode</span>
          <label class="radio-label">
            <input
              type="radio"
              name="colorMode"
              value="depth"
              :checked="preferences.appearance?.colorMode === 'depth'"
              @change="setColorMode('depth')"
            />
            <span>Color by depth</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="colorMode"
              value="filetype"
              :checked="preferences.appearance?.colorMode === 'filetype'"
              @change="setColorMode('filetype')"
            />
            <span>Color by file type</span>
          </label>
        </div>
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
            <span class="pattern">{{ excl.pattern }}</span>
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

defineEmits(['close'])

const { preferences, updateURL, addExclusion, removeExclusion, toggleExclusion } = usePreferences()

const newPattern = ref('')

const customExclusions = computed(() => {
  return preferences.value.filters?.customExclusions || []
})

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

function toggleHideClocignore(event) {
  if (!preferences.value.filters) {
    preferences.value.filters = {}
  }
  preferences.value.filters.hideClocignore = event.target.checked
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

.exclusion-item .pattern {
  flex: 1;
  font-size: 13px;
  font-family: monospace;
  color: #d4d4d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
