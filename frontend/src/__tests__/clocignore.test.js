import { describe, it, expect } from 'vitest'
import { parseClocignore, matchesPattern, filterTree } from '../utils/clocignore'

describe('parseClocignore', () => {
  it('returns empty array for empty string', () => {
    expect(parseClocignore('')).toEqual([])
  })

  it('returns empty array for whitespace only', () => {
    expect(parseClocignore('   \n\n   ')).toEqual([])
  })

  it('parses single pattern', () => {
    expect(parseClocignore('*.lock')).toEqual(['*.lock'])
  })

  it('parses multiple patterns', () => {
    const content = `*.lock
package-lock.json
yarn.lock`
    expect(parseClocignore(content)).toEqual(['*.lock', 'package-lock.json', 'yarn.lock'])
  })

  it('ignores comment lines', () => {
    const content = `# Lock files
*.lock
# Test fixtures
test/fixtures/**`
    expect(parseClocignore(content)).toEqual(['*.lock', 'test/fixtures/**'])
  })

  it('ignores blank lines', () => {
    const content = `*.lock

package-lock.json

yarn.lock`
    expect(parseClocignore(content)).toEqual(['*.lock', 'package-lock.json', 'yarn.lock'])
  })

  it('trims whitespace from patterns', () => {
    const content = `  *.lock
   package-lock.json   `
    expect(parseClocignore(content)).toEqual(['*.lock', 'package-lock.json'])
  })

  it('preserves negation patterns', () => {
    const content = `*.lock
!important.lock`
    expect(parseClocignore(content)).toEqual(['*.lock', '!important.lock'])
  })
})

describe('matchesPattern', () => {
  describe('exact filename patterns', () => {
    it('matches exact filename', () => {
      expect(matchesPattern('package-lock.json', 'package-lock.json')).toBe(true)
    })

    it('does not match different filename', () => {
      expect(matchesPattern('yarn.lock', 'package-lock.json')).toBe(false)
    })

    it('matches filename anywhere in path', () => {
      expect(matchesPattern('frontend/package-lock.json', 'package-lock.json')).toBe(true)
    })
  })

  describe('extension glob patterns', () => {
    it('matches *.lock extension', () => {
      expect(matchesPattern('yarn.lock', '*.lock')).toBe(true)
    })

    it('does not match partial extension', () => {
      // package-lock.json does NOT end with .lock
      expect(matchesPattern('package-lock.json', '*.lock')).toBe(false)
    })

    it('matches extension in nested path', () => {
      expect(matchesPattern('deps/Gemfile.lock', '*.lock')).toBe(true)
    })

    it('matches *.json extension', () => {
      expect(matchesPattern('data.json', '*.json')).toBe(true)
    })
  })

  describe('directory glob patterns', () => {
    it('matches files in directory with **', () => {
      expect(matchesPattern('test/fixtures/data.json', 'test/fixtures/**')).toBe(true)
    })

    it('matches nested files in directory with **', () => {
      expect(matchesPattern('test/fixtures/deep/nested/file.js', 'test/fixtures/**')).toBe(true)
    })

    it('does not match files outside directory', () => {
      expect(matchesPattern('src/app.js', 'test/**')).toBe(false)
    })

    it('matches with trailing slash', () => {
      expect(matchesPattern('dist/bundle.js', 'dist/**')).toBe(true)
    })
  })

  describe('complex patterns', () => {
    it('matches __tests__/__snapshots__/**', () => {
      expect(matchesPattern('src/__tests__/__snapshots__/App.test.js.snap', '__tests__/__snapshots__/**')).toBe(true)
    })

    it('matches *.generated.* pattern', () => {
      expect(matchesPattern('types.generated.ts', '*.generated.*')).toBe(true)
    })

    it('does not match non-generated files', () => {
      expect(matchesPattern('types.ts', '*.generated.*')).toBe(false)
    })
  })
})

describe('filterTree', () => {
  const sampleTree = {
    name: 'root',
    type: 'analysis_set',
    children: [
      {
        name: 'repo1',
        type: 'repository',
        path: 'repo1',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: 'repo1/src',
            children: [
              { name: 'app.js', type: 'file', path: 'repo1/src/app.js', value: 100 },
              { name: 'utils.js', type: 'file', path: 'repo1/src/utils.js', value: 50 }
            ]
          },
          { name: 'package-lock.json', type: 'file', path: 'repo1/package-lock.json', value: 5000 },
          { name: 'yarn.lock', type: 'file', path: 'repo1/yarn.lock', value: 3000 }
        ]
      },
      {
        name: 'repo2',
        type: 'repository',
        path: 'repo2',
        children: [
          {
            name: 'test',
            type: 'directory',
            path: 'repo2/test',
            children: [
              {
                name: 'fixtures',
                type: 'directory',
                path: 'repo2/test/fixtures',
                children: [
                  { name: 'data.json', type: 'file', path: 'repo2/test/fixtures/data.json', value: 2000 }
                ]
              },
              { name: 'app.test.js', type: 'file', path: 'repo2/test/app.test.js', value: 200 }
            ]
          }
        ]
      }
    ]
  }

  it('returns tree unchanged with empty patterns', () => {
    const result = filterTree(sampleTree, [])
    expect(result).toEqual(sampleTree)
  })

  it('returns tree unchanged with null patterns', () => {
    const result = filterTree(sampleTree, null)
    expect(result).toEqual(sampleTree)
  })

  it('filters out files matching exact filename', () => {
    const result = filterTree(sampleTree, ['package-lock.json'])

    const repo1 = result.children.find(c => c.name === 'repo1')
    const lockFile = repo1.children.find(c => c.name === 'package-lock.json')
    expect(lockFile).toBeUndefined()

    // yarn.lock should still be there
    const yarnLock = repo1.children.find(c => c.name === 'yarn.lock')
    expect(yarnLock).toBeDefined()
  })

  it('filters out files matching glob pattern', () => {
    const result = filterTree(sampleTree, ['*.lock'])

    const repo1 = result.children.find(c => c.name === 'repo1')
    const yarnLock = repo1.children.find(c => c.name === 'yarn.lock')
    expect(yarnLock).toBeUndefined()

    // package-lock.json should still be there (doesn't end with .lock)
    const lockFile = repo1.children.find(c => c.name === 'package-lock.json')
    expect(lockFile).toBeDefined()
  })

  it('filters out files in directory pattern', () => {
    const result = filterTree(sampleTree, ['test/fixtures/**'])

    const repo2 = result.children.find(c => c.name === 'repo2')
    const testDir = repo2.children.find(c => c.name === 'test')

    // fixtures directory should be removed (no children left)
    const fixtures = testDir.children.find(c => c.name === 'fixtures')
    expect(fixtures).toBeUndefined()

    // app.test.js should still be there
    const testFile = testDir.children.find(c => c.name === 'app.test.js')
    expect(testFile).toBeDefined()
  })

  it('removes empty directories after filtering', () => {
    // Filter all files in test/fixtures
    const result = filterTree(sampleTree, ['test/fixtures/**'])

    const repo2 = result.children.find(c => c.name === 'repo2')
    const testDir = repo2.children.find(c => c.name === 'test')

    // fixtures directory should be removed entirely
    expect(testDir.children.every(c => c.name !== 'fixtures')).toBe(true)
  })

  it('removes empty repositories after filtering all contents', () => {
    // Create a tree with a repo that will be empty after filtering
    const treeWithEmptyRepo = {
      name: 'root',
      type: 'analysis_set',
      children: [
        {
          name: 'only-locks',
          type: 'repository',
          path: 'only-locks',
          children: [
            { name: 'yarn.lock', type: 'file', path: 'only-locks/yarn.lock', value: 1000 }
          ]
        }
      ]
    }

    const result = filterTree(treeWithEmptyRepo, ['*.lock'])
    expect(result.children).toEqual([])
  })

  it('applies multiple patterns', () => {
    const result = filterTree(sampleTree, ['package-lock.json', '*.lock'])

    const repo1 = result.children.find(c => c.name === 'repo1')

    // Both lock files should be removed
    expect(repo1.children.find(c => c.name === 'package-lock.json')).toBeUndefined()
    expect(repo1.children.find(c => c.name === 'yarn.lock')).toBeUndefined()

    // src directory should still be there
    expect(repo1.children.find(c => c.name === 'src')).toBeDefined()
  })

  it('preserves tree structure (does not mutate original)', () => {
    const original = JSON.parse(JSON.stringify(sampleTree))
    filterTree(sampleTree, ['*.lock'])
    expect(sampleTree).toEqual(original)
  })

  it('handles negation patterns', () => {
    const result = filterTree(sampleTree, ['*.lock', '!yarn.lock'])

    const repo1 = result.children.find(c => c.name === 'repo1')

    // yarn.lock should be preserved due to negation
    expect(repo1.children.find(c => c.name === 'yarn.lock')).toBeDefined()
  })
})
