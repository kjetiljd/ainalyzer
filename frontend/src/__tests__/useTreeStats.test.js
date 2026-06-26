import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import {
  useTreeStats,
  findNodeByPath,
  countLeafValues,
  findMaxInTree,
  extentInTree,
  symmetricMaxInTree,
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

    // Deleted files live in the tree (type: 'deleted', value 0) so their growth rolls up,
    // but they are NOT part of the current code base: they must not inflate lines, file
    // counts, or directory counts.
    describe('deleted-file nodes', () => {
      const treeWithDeleted = {
        name: 'root',
        path: 'root',
        children: [
          {
            name: 'src',
            path: 'root/src',
            children: [
              { name: 'app.js', type: 'file', path: 'root/src/app.js', value: 200, commits: { last_year: 4 } },
              { name: 'old.js', type: 'deleted', path: 'root/src/old.js', value: 0, growth: { last_year: -80 } }
            ]
          },
          {
            // directory that exists ONLY because a deleted file used to live here
            name: 'gone',
            path: 'root/gone',
            children: [
              { name: 'removed.js', type: 'deleted', path: 'root/gone/removed.js', value: 0, growth: { last_year: -120 } }
            ]
          }
        ]
      }

      it('excludes deleted files from totalLines', () => {
        const { totalLines } = useTreeStats(ref(treeWithDeleted))
        expect(totalLines.value).toBe(200)
      })

      it('excludes deleted files from fileCount', () => {
        const { fileCount } = useTreeStats(ref(treeWithDeleted))
        expect(fileCount.value).toBe(1)
      })

      it('excludes deleted-only directories from directoryCount', () => {
        const { directoryCount } = useTreeStats(ref(treeWithDeleted))
        // root + src count (have a surviving file); 'gone' has only a deleted file
        expect(directoryCount.value).toBe(2)
      })
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

    it('includes deleted-file leaves in growth rollups', () => {
      // Deleted files contribute their churn so net growth is not overstated.
      const tree = {
        name: 'root',
        children: [
          { name: 'a.js', type: 'file', value: 100, growth: { last_year: 150 } },
          { name: 'gone.js', type: 'deleted', value: 0, growth: { last_year: -300 } }
        ]
      }
      const net = aggregateTree(tree, n => n.growth?.last_year || 0)
      expect(net).toBe(-150) // 150 + (−300)
    })
  })

  describe('extentInTree', () => {
    const signedTree = {
      name: 'root',
      children: [
        { name: 'a', growth: { last_year: -120 } },
        { name: 'b', growth: { last_year: 40 } },
        { name: 'sub', children: [
          { name: 'c', growth: { last_year: 75 } },
          { name: 'd', growth: { last_year: -10 } }
        ] }
      ]
    }

    it('returns both min and max in one pass', () => {
      const ext = extentInTree(signedTree, n => n.growth?.last_year || 0)
      expect(ext.min).toBe(-120)
      expect(ext.max).toBe(75)
    })

    it('passes depth to the accessor', () => {
      const ext = extentInTree(sampleTree, (n, depth) => depth)
      expect(ext.max).toBe(2)
      expect(ext.min).toBe(0)
    })

    it('handles null root', () => {
      expect(extentInTree(null, n => n.value || 0)).toEqual({ min: 0, max: 0 })
    })

    it('handles a flat (leaf) node', () => {
      const ext = extentInTree({ name: 'f', value: 42 }, n => n.value || 0)
      expect(ext).toEqual({ min: 42, max: 42 })
    })
  })

  describe('symmetricMaxInTree', () => {
    it('returns max(|min|, |max|) for diverging normalization', () => {
      const tree = {
        name: 'root',
        children: [
          { name: 'a', growth: { last_year: -300 } },
          { name: 'b', growth: { last_year: 120 } }
        ]
      }
      const m = symmetricMaxInTree(tree, n => n.growth?.last_year || 0)
      expect(m).toBe(300) // |−300| > |120|
    })

    it('is zero for an all-zero tree', () => {
      const tree = { name: 'root', children: [{ name: 'a', growth: { last_year: 0 } }] }
      expect(symmetricMaxInTree(tree, n => n.growth?.last_year || 0)).toBe(0)
    })
  })
})
