/**
 * .clocignore file parsing and pattern matching utilities
 */
import picomatch from 'picomatch-browser'

/**
 * Parse .clocignore file content into array of patterns
 * @param {string} content - Raw file content
 * @returns {string[]} Array of patterns
 */
export function parseClocignore(content) {
  if (!content) return []

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
}

/**
 * Check if a file path matches a glob pattern
 * Uses micromatch for proper gitignore-style glob matching
 * @param {string} filePath - File path to check
 * @param {string} pattern - Glob pattern
 * @returns {boolean} True if path matches pattern
 */
export function matchesPattern(filePath, pattern) {
  // Normalize pattern: remove leading slash if present
  let normalizedPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern

  // For patterns without path separators (e.g., "package-lock.json", "*.lock"),
  // match against the filename only OR match anywhere with **/ prefix
  if (!normalizedPattern.includes('/')) {
    const filename = filePath.split('/').pop()
    // Try matching filename directly
    if (picomatch.isMatch(filename, normalizedPattern)) {
      return true
    }
    // Also try matching full path (for patterns that should work anywhere)
    return picomatch.isMatch(filePath, '**/' + normalizedPattern)
  }

  // For patterns with path separators, match against full path
  // Patterns are anchored - test/fixtures/** only matches test/fixtures/ at root,
  // not repo/test/fixtures/. Use **/test/fixtures/** for anywhere matching.
  return picomatch.isMatch(filePath, normalizedPattern)
}

/**
 * Filter tree to exclude files matching patterns
 * @param {object} tree - Tree structure from analysis JSON
 * @param {string[]|null} patterns - Array of glob patterns
 * @returns {object} Filtered tree (new object, original unchanged)
 */
export function filterTree(tree, patterns) {
  if (!patterns || patterns.length === 0) {
    return tree
  }

  // Separate negation patterns from exclusion patterns
  const exclusions = patterns.filter(p => !p.startsWith('!'))
  const negations = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1))

  function shouldExclude(path) {
    // Check if any exclusion pattern matches
    const excluded = exclusions.some(pattern => matchesPattern(path, pattern))
    if (!excluded) return false

    // Check if any negation pattern saves it
    const saved = negations.some(pattern => matchesPattern(path, pattern))
    return !saved
  }

  function filterNode(node) {
    // If this is a file, check if it should be excluded
    if (node.type === 'file') {
      if (shouldExclude(node.path)) {
        return null
      }
      return { ...node }
    }

    // For directories/repos/analysis_set, filter children recursively
    if (node.children) {
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter(child => child !== null)

      // Remove empty containers
      if (filteredChildren.length === 0) {
        return null
      }

      return {
        ...node,
        children: filteredChildren
      }
    }

    return { ...node }
  }

  return filterNode(tree) || { ...tree, children: [] }
}
