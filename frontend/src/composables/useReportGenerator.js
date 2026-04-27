import { aggregateTree, countLeafValues } from './useTreeStats'

/**
 * Generate a Markdown analysis report from the current analysis data.
 *
 * Pure function - no Vue reactivity, just data in, string out.
 *
 * @param {Object} options
 * @param {Object} options.analysisInfo - { name, generatedAt, stats }
 * @param {string} options.rootPath - Root path of the analysis
 * @param {Object} options.tree - Full analysis tree (unfiltered)
 * @param {string[]} options.clocignorePatterns - Parsed .clocignore patterns
 * @param {Array} options.customExclusions - [{ pattern, enabled }]
 * @returns {string} Markdown report
 */
export function generateReport({ analysisInfo, rootPath, tree, clocignorePatterns, customExclusions }) {
  const sections = [
    generateMetadata(analysisInfo, rootPath),
    generateConfiguration(clocignorePatterns, customExclusions),
    generateRepoTable(tree),
    generateAggregateStats(tree, analysisInfo)
  ]

  return sections.join('\n\n---\n\n') + '\n'
}

function generateMetadata(analysisInfo, rootPath) {
  const date = analysisInfo.generatedAt
    ? new Date(analysisInfo.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'Unknown'

  return [
    `# Analysis Report: ${analysisInfo.name}`,
    '',
    `- **Generated:** ${date}`,
    `- **Root path:** \`${rootPath || 'N/A'}\``
  ].join('\n')
}

function generateConfiguration(clocignorePatterns, customExclusions) {
  const lines = ['## Configuration']

  if (clocignorePatterns.length > 0) {
    lines.push('', '### .clocignore Patterns', '')
    lines.push('```')
    clocignorePatterns.forEach(p => lines.push(p))
    lines.push('```')
  }

  const enabled = (customExclusions || []).filter(e => e.enabled)
  if (enabled.length > 0) {
    lines.push('', '### Custom Exclusions', '')
    enabled.forEach(e => lines.push(`- \`${e.pattern}\``))
  }

  if (clocignorePatterns.length === 0 && enabled.length === 0) {
    lines.push('', 'No exclusion patterns configured.')
  }

  return lines.join('\n')
}

function generateRepoTable(tree) {
  if (!tree || !tree.children) return '## Repository Summary\n\nNo repository data available.'

  const repos = tree.children
    .filter(child => child.children) // directories (repos)
    .map(repo => {
      const lines = aggregateTree(repo, n => n.value || 0)
      const files = aggregateTree(repo, n => n.value ? 1 : 0)
      const unchangedYear = aggregateTree(repo, n => {
        if (!n.value) return 0
        return (n.commits?.last_year || 0) === 0 ? 1 : 0
      })
      const pctUnchanged = files > 0 ? Math.round((unchangedYear / files) * 100) : 0

      return { name: repo.name, lines, files, unchangedYear, pctUnchanged }
    })

  const totals = repos.reduce((acc, r) => ({
    lines: acc.lines + r.lines,
    files: acc.files + r.files,
    unchangedYear: acc.unchangedYear + r.unchangedYear
  }), { lines: 0, files: 0, unchangedYear: 0 })
  totals.pctUnchanged = totals.files > 0 ? Math.round((totals.unchangedYear / totals.files) * 100) : 0

  const tableLines = [
    '## Repository Summary',
    '',
    '| Repository | Lines | Files | Unchanged (1yr) | % Unchanged |',
    '|------------|------:|------:|----------------:|------------:|'
  ]

  for (const r of repos) {
    tableLines.push(
      `| ${r.name} | ${r.lines.toLocaleString()} | ${r.files.toLocaleString()} | ${r.unchangedYear.toLocaleString()} | ${r.pctUnchanged}% |`
    )
  }

  tableLines.push(
    `| **Total** | **${totals.lines.toLocaleString()}** | **${totals.files.toLocaleString()}** | **${totals.unchangedYear.toLocaleString()}** | **${totals.pctUnchanged}%** |`
  )

  return tableLines.join('\n')
}

function generateAggregateStats(tree, analysisInfo) {
  const lines = ['## Aggregate Statistics']

  const stats = analysisInfo.stats
  if (stats) {
    lines.push('')
    lines.push(`- **Total lines of code:** ${stats.total_lines?.toLocaleString() || 'N/A'}`)
    lines.push(`- **Total files:** ${stats.total_files?.toLocaleString() || 'N/A'}`)
    if (stats.total_repos) {
      lines.push(`- **Repositories:** ${stats.total_repos}`)
    }
  }

  // Language breakdown from tree
  if (tree) {
    const langCounts = countLeafValues(tree, n => n.language)
    const sorted = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    if (sorted.length > 0) {
      lines.push('')
      lines.push('### Files by Language (Top 10)')
      lines.push('')
      lines.push('| Language | Files |')
      lines.push('|----------|------:|')
      for (const [lang, count] of sorted) {
        lines.push(`| ${lang} | ${count.toLocaleString()} |`)
      }
    }

    // Lines by language
    const langLines = {}
    function walkForLines(node) {
      if (!node) return
      if (!node.children) {
        if (node.language && node.value) {
          langLines[node.language] = (langLines[node.language] || 0) + node.value
        }
        return
      }
      node.children.forEach(walkForLines)
    }
    walkForLines(tree)

    const sortedLines = Object.entries(langLines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    if (sortedLines.length > 0) {
      lines.push('')
      lines.push('### Lines by Language (Top 10)')
      lines.push('')
      lines.push('| Language | Lines |')
      lines.push('|----------|------:|')
      for (const [lang, count] of sortedLines) {
        lines.push(`| ${lang} | ${count.toLocaleString()} |`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Trigger a file download in the browser.
 *
 * @param {string} content - File content
 * @param {string} filename - Download filename
 */
export function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
