import { describe, it, expect } from 'vitest'
import { generateReport } from '../composables/useReportGenerator'

const sampleTree = {
  name: 'my-project',
  type: 'analysis_set',
  children: [
    {
      name: 'backend-api',
      type: 'repository',
      path: 'backend-api',
      children: [
        {
          name: 'src',
          path: 'backend-api/src',
          children: [
            { name: 'auth.py', path: 'backend-api/src/auth.py', value: 500, language: 'Python', commits: { last_3_months: 3, last_year: 12, last_commit_date: '2025-11-15' } },
            { name: 'main.py', path: 'backend-api/src/main.py', value: 300, language: 'Python', commits: { last_3_months: 0, last_year: 0 } }
          ]
        }
      ]
    },
    {
      name: 'frontend',
      type: 'repository',
      path: 'frontend',
      children: [
        { name: 'app.js', path: 'frontend/app.js', value: 200, language: 'JavaScript', commits: { last_3_months: 5, last_year: 20 } },
        { name: 'style.css', path: 'frontend/style.css', value: 100, language: 'CSS', commits: { last_3_months: 1, last_year: 2 } }
      ]
    }
  ]
}

const baseOptions = {
  analysisInfo: {
    name: 'my-project',
    generatedAt: '2025-12-01T10:30:00Z',
    stats: { total_lines: 1100, total_files: 4, total_repos: 2 }
  },
  rootPath: '/home/user/repos',
  tree: sampleTree,
  clocignorePatterns: [],
  customExclusions: []
}

describe('generateReport', () => {
  it('includes metadata header', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('# Analysis Report: my-project')
    expect(report).toContain('**Generated:**')
    expect(report).toContain('`/home/user/repos`')
  })

  it('includes repository summary table', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('## Repository Summary')
    expect(report).toContain('| backend-api |')
    expect(report).toContain('| frontend |')
    expect(report).toContain('| **Total** |')
  })

  it('calculates correct file counts per repo', () => {
    const report = generateReport(baseOptions)
    // backend-api: 2 files, frontend: 2 files
    expect(report).toContain('| backend-api | 800 | 2 |')
    expect(report).toContain('| frontend | 300 | 2 |')
  })

  it('calculates unchanged files correctly', () => {
    const report = generateReport(baseOptions)
    // backend-api: main.py has 0 commits last_year -> 1 unchanged out of 2 -> 50%
    expect(report).toMatch(/backend-api.*1.*50%/)
    // frontend: both have commits -> 0 unchanged -> 0%
    expect(report).toMatch(/frontend.*0.*0%/)
  })

  it('includes aggregate statistics', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('## Aggregate Statistics')
    expect(report).toContain('1,100')
    expect(report).toContain('**Repositories:** 2')
  })

  it('includes language breakdown by files', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('### Files by Language')
    expect(report).toContain('| Python | 2 |')
    expect(report).toContain('| JavaScript | 1 |')
    expect(report).toContain('| CSS | 1 |')
  })

  it('includes language breakdown by lines', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('### Lines by Language')
    expect(report).toContain('| Python | 800 |')
    expect(report).toContain('| JavaScript | 200 |')
    expect(report).toContain('| CSS | 100 |')
  })

  it('shows clocignore patterns when present', () => {
    const report = generateReport({
      ...baseOptions,
      clocignorePatterns: ['node_modules/', '*.min.js']
    })
    expect(report).toContain('### .clocignore Patterns')
    expect(report).toContain('node_modules/')
    expect(report).toContain('*.min.js')
  })

  it('shows custom exclusions when present', () => {
    const report = generateReport({
      ...baseOptions,
      customExclusions: [
        { pattern: 'vendor/**', enabled: true },
        { pattern: 'docs/**', enabled: false }
      ]
    })
    expect(report).toContain('### Custom Exclusions')
    expect(report).toContain('`vendor/**`')
    expect(report).not.toContain('`docs/**`')
  })

  it('shows "no patterns" when none configured', () => {
    const report = generateReport(baseOptions)
    expect(report).toContain('No exclusion patterns configured.')
  })

  it('handles missing generatedAt', () => {
    const report = generateReport({
      ...baseOptions,
      analysisInfo: { ...baseOptions.analysisInfo, generatedAt: null }
    })
    expect(report).toContain('**Generated:** Unknown')
  })

  it('handles tree with no children', () => {
    const report = generateReport({
      ...baseOptions,
      tree: { name: 'empty' }
    })
    expect(report).toContain('No repository data available')
  })

  it('handles null tree', () => {
    const report = generateReport({
      ...baseOptions,
      tree: null
    })
    expect(report).toContain('No repository data available')
  })

  it('produces valid markdown table alignment', () => {
    const report = generateReport(baseOptions)
    // Right-aligned numeric columns
    expect(report).toContain('------:|')
  })
})
