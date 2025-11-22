<script setup>
import Treemap from './components/Treemap.vue'

const mockData = {
  name: 'ainalyzer-demo',
  children: [
    {
      name: 'backend-api',
      children: [
        {
          name: 'src',
          children: [
            { name: 'auth.py', value: 1234 },
            { name: 'database.py', value: 2100 },
            { name: 'api.py', value: 890 }
          ]
        },
        {
          name: 'tests',
          children: [
            { name: 'test_auth.py', value: 800 },
            { name: 'test_api.py', value: 950 }
          ]
        }
      ]
    },
    {
      name: 'frontend',
      children: [
        {
          name: 'components',
          children: [
            { name: 'Header.vue', value: 450 },
            { name: 'Sidebar.vue', value: 380 }
          ]
        },
        {
          name: 'views',
          children: [
            { name: 'Dashboard.vue', value: 1200 },
            { name: 'Settings.vue', value: 560 }
          ]
        }
      ]
    }
  ]
}
</script>

<template>
  <div class="app">
    <h1>Ainalyzer - Code Visibility</h1>
    <Treemap :data="mockData" :width="1200" :height="800" />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
}

.app {
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  margin: 0 0 20px 0;
  font-size: 24px;
}
</style>
