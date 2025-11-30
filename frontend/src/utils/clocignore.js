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
  const filename = filePath.split('/').pop()

  // Handle **/filename patterns (filename anywhere, no extension glob)
  if (pattern.startsWith('**/') && !pattern.includes('*.')) {
    const targetFilename = pattern.slice(3) // Remove **/
    return filename === targetFilename
  }

  // Handle **/*.ext patterns (extension matching anywhere)
  if (pattern.startsWith('**/') && pattern.includes('*.')) {
    const suffix = pattern.slice(3) // Remove **/
    if (suffix.startsWith('*.')) {
      // **/*.json - match extension anywhere
      const ext = suffix.slice(1) // .json
      return filePath.endsWith(ext)
    }
  }

  // Handle repo/**/*.ext patterns (extension within specific repo)
  if (pattern.includes('/**/*.')) {
    // repo/**/*.json
    const [prefix, suffix] = pattern.split('/**/')
    const ext = suffix.slice(1) // .json from *.json
    return filePath.startsWith(prefix + '/') && filePath.endsWith(ext)
  }

  // Handle repo/**/filename patterns (specific filename within repo)
  if (pattern.includes('/**/') && !pattern.includes('*.')) {
    const [prefix, suffix] = pattern.split('/**/')
    return filePath.startsWith(prefix + '/') && filename === suffix
  }

  // Handle directory patterns with ** (e.g., test/fixtures/**)
  // This pattern should match files that CONTAIN this path, not just start with it
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3) // Remove /**
    // Match if path contains the directory (e.g., src/__tests__/__snapshots__/file.snap contains __tests__/__snapshots__)
    return filePath.includes(prefix + '/') || filePath.startsWith(prefix + '/') || filePath === prefix
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
    const parts = filename.split('.')
    // Check if middle part exists between first and last dot
    return parts.length >= 3 && parts.slice(1, -1).includes(middle)
  }

  // If pattern contains /, it's a path pattern - match exactly or as suffix
  if (pattern.includes('/')) {
    // Exact path match or path ends with pattern
    return filePath === pattern || filePath.endsWith('/' + pattern)
  }

  // Exact filename match (anywhere in path)
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
