import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import {
  useTreeStats,
  findNodeByPath,
  countLeafValues,
  findMaxInTree,
  aggregateTree
} from '../composables/useTreeStats'

describe('useTreeStats', () => {
  const sampleTree = {
    name: 'root',
    path: 'root',
    children: [
      {
        name: 'src',
        path: 'root/src',
        children: [
          { name: 'main.js', path: 'root/src/main.js', value: 100, language: 'JavaScript', commits: { last_year: 5 } },
          { name: 'app.js', path: 'root/src/app.js', value: 200, language: 'JavaScript', commits: { last_year: 10 } }
        ]
      },
      {
        name: 'tests',
        path: 'root/tests',
        children: [
          { name: 'test.py', path: 'root/tests/test.py', value: 50, language: 'Python', commits: { last_year: 2 } }
        ]
      }
    ]
  }

  describe('useTreeStats composable', () => {
    it('calculates totalLines correctly', () => {
      const treeRef = ref(sampleTree)
      const { totalLines } = useTreeStats(treeRef)
      expect(totalLines.value).toBe(350) // 100 + 200 + 50
    })

    it('calculates fileCount correctly', () => {
      const treeRef = ref(sampleTree)
      const { fileCount } = useTreeStats(treeRef)
      expect(fileCount.value).toBe(3)
    })

    it('calculates directoryCount correctly', () => {
      const treeRef = ref(sampleTree)
      const { directoryCount } = useTreeStats(treeRef)
      expect(directoryCount.value).toBe(3) // root, src, tests
    })

    it('calculates changes correctly', () => {
      const treeRef = ref(sampleTree)
      const { changes } = useTreeStats(treeRef)
      expect(changes.value).toBe(17) // 5 + 10 + 2
    })

    it('handles null tree', () => {
      const treeRef = ref(null)
      const { totalLines, fileCount, directoryCount, changes } = useTreeStats(treeRef)
      expect(totalLines.value).toBe(0)
      expect(fileCount.value).toBe(0)
      expect(directoryCount.value).toBe(0)
      expect(changes.value).toBe(0)
    })

    it('handles leaf node directly', () => {
      const leafRef = ref({ name: 'file.js', value: 100, commits: { last_year: 5 } })
      const { totalLines, fileCount, changes } = useTreeStats(leafRef)
      expect(totalLines.value).toBe(100)
      expect(fileCount.value).toBe(1)
      expect(changes.value).toBe(5)
    })

    it('reacts to tree changes', () => {
      const treeRef = ref(sampleTree)
      const { totalLines } = useTreeStats(treeRef)
      expect(totalLines.value).toBe(350)

      // Change to a different tree
      treeRef.value = {
        name: 'new',
        children: [{ name: 'file.js', value: 500 }]
      }
      expect(totalLines.value).toBe(500)
    })

    it('handles missing commits gracefully', () => {
      const treeRef = ref({
        name: 'root',
        children: [
          { name: 'file.js', value: 100 } // no commits
        ]
      })
      const { changes } = useTreeStats(treeRef)
      expect(changes.value).toBe(0)
    })
  })

  describe('findNodeByPath', () => {
    it('finds root node', () => {
      const found = findNodeByPath(sampleTree, 'root')
      expect(found).toBe(sampleTree)
    })

    it('finds nested directory', () => {
      const found = findNodeByPath(sampleTree, 'root/src')
      expect(found.name).toBe('src')
    })

    it('finds leaf node', () => {
      const found = findNodeByPath(sampleTree, 'root/src/main.js')
      expect(found.name).toBe('main.js')
      expect(found.value).toBe(100)
    })

    it('returns null for non-existent path', () => {
      const found = findNodeByPath(sampleTree, 'root/nonexistent')
      expect(found).toBeNull()
    })

    it('handles null root', () => {
      const found = findNodeByPath(null, 'any')
      expect(found).toBeNull()
    })
  })

  describe('countLeafValues', () => {
    it('counts languages', () => {
      const counts = countLeafValues(sampleTree, n => n.language)
      expect(counts).toEqual({
        JavaScript: 2,
        Python: 1
      })
    })

    it('handles null keys', () => {
      const tree = {
        children: [
          { name: 'a', language: 'JS' },
          { name: 'b' } // no language
        ]
      }
      const counts = countLeafValues(tree, n => n.language)
      expect(counts).toEqual({ JS: 1 })
    })

    it('handles null root', () => {
      const counts = countLeafValues(null, n => n.language)
      expect(counts).toEqual({})
    })
  })

  describe('findMaxInTree', () => {
    it('finds max commit count', () => {
      const max = findMaxInTree(sampleTree, n => n.commits?.last_year || 0)
      expect(max).toBe(10)
    })

    it('finds max depth', () => {
      const max = findMaxInTree(sampleTree, (n, depth) => depth)
      expect(max).toBe(2) // root=0, src/tests=1, files=2
    })

    it('handles null root', () => {
      const max = findMaxInTree(null, n => n.value || 0)
      expect(max).toBe(0)
    })

    it('handles flat tree', () => {
      const flat = { name: 'file', value: 42 }
      const max = findMaxInTree(flat, n => n.value || 0)
      expect(max).toBe(42)
    })
  })

  describe('aggregateTree', () => {
    it('sums commit counts', () => {
      const sum = aggregateTree(sampleTree, n => n.commits?.last_year || 0)
      expect(sum).toBe(17) // 5 + 10 + 2
    })

    it('sums values', () => {
      const sum = aggregateTree(sampleTree, n => n.value || 0)
      expect(sum).toBe(350)
    })

    it('handles null root', () => {
      const sum = aggregateTree(null, n => n.value || 0)
      expect(sum).toBe(0)
    })

    it('handles leaf node', () => {
      const leaf = { name: 'file', value: 100, commits: { last_year: 5 } }
      const sum = aggregateTree(leaf, n => n.commits?.last_year || 0)
      expect(sum).toBe(5)
    })
  })
})
