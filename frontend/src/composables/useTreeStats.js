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
    return aggregate(treeRef.value, n => n.value ? 1 : 0)
  })

  const directoryCount = computed(() => {
    function count(node) {
      if (!node || !node.children) return 0
      return 1 + node.children.reduce((sum, child) => sum + count(child), 0)
    }
    return count(treeRef.value)
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
 * Find maximum value in tree.
 *
 * @param {Object} node - Tree node
 * @param {Function} getValue - Extract value from node, receives (node, depth)
 * @param {number} depth - Current depth
 * @returns {number} Maximum value
 */
export function findMaxInTree(node, getValue, depth = 0) {
  if (!node) return 0

  let max = getValue(node, depth)

  if (node.children) {
    for (const child of node.children) {
      const childMax = findMaxInTree(child, getValue, depth + 1)
      if (childMax > max) max = childMax
    }
  }

  return max
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
