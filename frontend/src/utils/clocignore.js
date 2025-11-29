/**
 * .clocignore file parsing and pattern matching utilities
 */

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
 * @param {string} filePath - File path to check
 * @param {string} pattern - Glob pattern
 * @returns {boolean} True if path matches pattern
 */
export function matchesPattern(filePath, pattern) {
  // Handle directory patterns with **
  if (pattern.includes('**')) {
    // test/fixtures/** matches test/fixtures/anything
    const prefix = pattern.replace('/**', '')
    // Match if path contains this directory prefix
    return filePath.includes(prefix + '/')
  }

  // Handle *.ext patterns (extension matching)
  if (pattern.startsWith('*.') && pattern.indexOf('*', 1) === -1) {
    // Simple extension: *.lock, *.json
    const ext = pattern.slice(1) // .lock, .json
    return filePath.endsWith(ext)
  }

  // Handle *.something.* patterns (e.g., *.generated.*)
  if (pattern.startsWith('*.') && pattern.endsWith('.*')) {
    // *.generated.* should match types.generated.ts
    const middle = pattern.slice(2, -2) // "generated"
    const filename = filePath.split('/').pop()
    const parts = filename.split('.')
    // Check if middle part exists between first and last dot
    return parts.length >= 3 && parts.slice(1, -1).includes(middle)
  }

  // Exact filename match (anywhere in path)
  const filename = filePath.split('/').pop()
  return filename === pattern
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
