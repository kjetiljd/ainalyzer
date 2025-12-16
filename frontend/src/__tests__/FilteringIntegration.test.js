import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { filterTree } from '../utils/clocignore'

// Mock fetch for analysis data
const mockTreeData = {
  analysis_set: 'test-filter',
  generated_at: '2025-01-01T00:00:00Z',
  root_path: '/test/repos',
  stats: { total_files: 5, total_lines: 1000 },
  tree: {
    name: 'test-filter',
    type: 'analysis_set',
    children: [
      {
        name: 'repo1',
        type: 'repository',
        path: 'repo1',
        children: [
          { name: 'package-lock.json', type: 'file', path: 'repo1/package-lock.json', value: 5000 },
          { name: 'yarn.lock', type: 'file', path: 'repo1/yarn.lock', value: 3000 },
          { name: 'app.js', type: 'file', path: 'repo1/app.js', value: 100 },
          {
            name: 'node_modules',
            type: 'directory',
            path: 'repo1/node_modules',
            children: [
              { name: 'lodash.js', type: 'file', path: 'repo1/node_modules/lodash.js', value: 10000 }
            ]
          }
        ]
      }
    ]
  }
}

describe('Filter Integration', () => {
  // Test the filtering logic directly first
  it('filters out files correctly with clocignore patterns', () => {
    const patterns = ['*.lock', 'node_modules/**']
    const result = filterTree(mockTreeData.tree, patterns)

    const repo1 = result.children.find(c => c.name === 'repo1')
    
    // Should exclude yarn.lock (ends with .lock)
    expect(repo1.children.find(c => c.name === 'yarn.lock')).toBeUndefined()
    
    // Should keep package-lock.json (ends with .json, not .lock)
    expect(repo1.children.find(c => c.name === 'package-lock.json')).toBeDefined()
    
    // Should exclude node_modules directory
    expect(repo1.children.find(c => c.name === 'node_modules')).toBeUndefined()
    
    // Should keep app.js
    expect(repo1.children.find(c => c.name === 'app.js')).toBeDefined()
  })

  it('shows all files when no patterns are applied', () => {
    const result = filterTree(mockTreeData.tree, [])

    const repo1 = result.children.find(c => c.name === 'repo1')
    
    // All files should be present
    expect(repo1.children.find(c => c.name === 'package-lock.json')).toBeDefined()
    expect(repo1.children.find(c => c.name === 'yarn.lock')).toBeDefined()
    expect(repo1.children.find(c => c.name === 'node_modules')).toBeDefined()
    expect(repo1.children.find(c => c.name === 'app.js')).toBeDefined()
  })

  it('debug: test matchesPattern directly', () => {
    // Import the function to test it directly
    const { matchesPattern } = require('../utils/clocignore')
    
    // Test the problematic cases
    console.log('package-lock.json matches **/*.js:', matchesPattern('repo1/package-lock.json', '**/*.js'))
    console.log('yarn.lock matches **/*.js:', matchesPattern('repo1/yarn.lock', '**/*.js'))
    console.log('app.js matches **/*.js:', matchesPattern('repo1/app.js', '**/*.js'))
    
    // This should pass if the function works correctly
    expect(matchesPattern('repo1/package-lock.json', '**/*.js')).toBe(false)
    expect(matchesPattern('repo1/yarn.lock', '**/*.js')).toBe(false)  
    expect(matchesPattern('repo1/app.js', '**/*.js')).toBe(true)
  })

  // Test edge case with patterns that should match but might not due to bugs
  it('matches patterns correctly for different file types', () => {
    // Test specific bug scenarios users might encounter
    
    // 1. Package-lock.json should NOT match *.lock pattern
    const lockPattern = filterTree(mockTreeData.tree, ['*.lock'])
    const repo1Lock = lockPattern.children.find(c => c.name === 'repo1')
    expect(repo1Lock.children.find(c => c.name === 'package-lock.json')).toBeDefined() // Should stay
    expect(repo1Lock.children.find(c => c.name === 'yarn.lock')).toBeUndefined() // Should be filtered

    // 2. Directory patterns should work
    const nodePattern = filterTree(mockTreeData.tree, ['**/node_modules/**'])
    const repo1Node = nodePattern.children.find(c => c.name === 'repo1')
    expect(repo1Node.children.find(c => c.name === 'node_modules')).toBeUndefined()
    
    // 3. Exact filename matching should work
    const exactPattern = filterTree(mockTreeData.tree, ['package-lock.json'])
    const repo1Exact = exactPattern.children.find(c => c.name === 'repo1')
    expect(repo1Exact.children.find(c => c.name === 'package-lock.json')).toBeUndefined()
    expect(repo1Exact.children.find(c => c.name === 'yarn.lock')).toBeDefined() // Should stay
  })
})