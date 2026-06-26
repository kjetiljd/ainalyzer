import { computed } from 'vue'

/**
 * Composable for calculating statistics from an analysis tree.
 *
 * Provides computed properties that automatically update when the tree changes.
 * All traversal logic is encapsulated here - components just use the results.
 *
 * @param {Ref<Object>} treeRef - Reactive reference to tree node
 * @returns {Object} Computed statistics
 *
 * @example
 * const { totalLines, fileCount, changes } = useTreeStats(toRef(props, 'currentNode'))
 */
export function useTreeStats(treeRef) {

  // Internal traversal - not exported
  function aggregate(node, leafValue) {
    if (!node) return 0
    if (!node.children) return leafValue(node)
    return node.children.reduce((sum, child) => sum + aggregate(child, leafValue), 0)
  }

  const totalLines = computed(() => {
    const node = treeRef.value
    if (!node) return 0
    // Files have value directly, directories aggregate children
    if (node.value) return node.value
    return aggregate(node, n => n.value || 0)
  })

  const fileCount = computed(() => {
    // Deleted-file nodes (value 0) are not part of the current code base.
    return aggregate(treeRef.value, n => (n.type === 'deleted' || !n.value) ? 0 : 1)
  })

  const directoryCount = computed(() => {
    // Count container nodes that hold at least one surviving (non-deleted) file. A directory
    // that exists only to host deleted-file nodes is not part of the current code base and
    // must not inflate the count.
    function walk(node) {
      if (!node) return { dirs: 0, hasSurviving: false }
      if (!node.children) {
        return { dirs: 0, hasSurviving: node.type !== 'deleted' }
      }
      let dirs = 0
      let hasSurviving = false
      for (const child of node.children) {
        const r = walk(child)
        dirs += r.dirs
        if (r.hasSurviving) hasSurviving = true
      }
      return { dirs: dirs + (hasSurviving ? 1 : 0), hasSurviving }
    }
    return walk(treeRef.value).dirs
  })

  const changes = computed(() => {
    return aggregate(treeRef.value, n => n.commits?.last_year || 0)
  })

  return {
    totalLines,
    fileCount,
    directoryCount,
    changes
  }
}

/**
 * Find a node by path in the tree.
 *
 * @param {Object} root - Tree root node
 * @param {string} targetPath - Path to find
 * @returns {Object|null} Matching node or null
 */
export function findNodeByPath(root, targetPath) {
  if (!root) return null
  if (root.path === targetPath) return root

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeByPath(child, targetPath)
      if (found) return found
    }
  }

  return null
}

/**
 * Count occurrences of a property value across leaf nodes.
 *
 * @param {Object} node - Tree node
 * @param {Function} getKey - Extract key from leaf node
 * @returns {Object} Map of key -> count
 */
export function countLeafValues(node, getKey) {
  const counts = {}

  function traverse(n) {
    if (!n) return
    if (!n.children) {
      const key = getKey(n)
      if (key) counts[key] = (counts[key] || 0) + 1
    } else {
      n.children.forEach(traverse)
    }
  }

  traverse(node)
  return counts
}

/**
 * Find the min and max value across a tree in a single pass.
 *
 * @param {Object} node - Tree node
 * @param {Function} getValue - Extract value from node, receives (node, depth)
 * @param {number} depth - Current depth
 * @returns {{min: number, max: number}} Extent of values
 */
export function extentInTree(node, getValue, depth = 0) {
  if (!node) return { min: 0, max: 0 }

  const value = getValue(node, depth)
  let min = value
  let max = value

  if (node.children) {
    for (const child of node.children) {
      const childExtent = extentInTree(child, getValue, depth + 1)
      if (childExtent.min < min) min = childExtent.min
      if (childExtent.max > max) max = childExtent.max
    }
  }

  return { min, max }
}

/**
 * Find maximum value in tree.
 *
 * Thin wrapper over extentInTree (single-pass min/max), kept for callers that only
 * need the (non-negative) maximum.
 *
 * @param {Object} node - Tree node
 * @param {Function} getValue - Extract value from node, receives (node, depth)
 * @param {number} depth - Current depth
 * @returns {number} Maximum value
 */
export function findMaxInTree(node, getValue, depth = 0) {
  return extentInTree(node, getValue, depth).max
}

/**
 * Find the symmetric maximum magnitude across a tree: max(|min|, |max|).
 *
 * Used for diverging color normalization where values can be negative (e.g. net growth),
 * so that the neutral midpoint stays centered on zero.
 *
 * @param {Object} node - Tree node
 * @param {Function} getValue - Extract value from node, receives (node, depth)
 * @returns {number} Symmetric maximum magnitude
 */
export function symmetricMaxInTree(node, getValue) {
  const { min, max } = extentInTree(node, getValue)
  return Math.max(Math.abs(min), Math.abs(max))
}

/**
 * Aggregate values across tree using sum.
 *
 * @param {Object} node - Tree node
 * @param {Function} leafValue - Extract value from leaf node
 * @returns {number} Sum of all leaf values
 */
export function aggregateTree(node, leafValue) {
  if (!node) return 0
  if (!node.children) return leafValue(node)
  return node.children.reduce((sum, child) => sum + aggregateTree(child, leafValue), 0)
}
