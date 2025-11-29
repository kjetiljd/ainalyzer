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
      </section>
    </div>
  </div>
</template>

<script setup>
import { usePreferences } from '../composables/usePreferences'

defineEmits(['close'])

const { preferences, updateURL } = usePreferences()

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
</style>
