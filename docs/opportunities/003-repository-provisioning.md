# Opportunity: Repository Provisioning

**Status:** Next
**Last Updated:** 2025-11-21

## Desired Outcome

Teams can clone and update repositories from `.meta` definitions without manual Git commands.

## Opportunity (Problem Space)

**Current State:**
- Manual `git clone` for each repository
- No automated updates across repository sets
- Inconsistent clone locations
- Error-prone setup for new team members

**Impact:**
- Time wasted on repository setup
- Outdated local copies cause confusion
- Onboarding friction
- Can't reliably reproduce analysis environment

**User Needs:**
- Clone all repos from `.meta` with single command
- Update existing repos to latest state
- Consistent directory structure
- Handle SSH keys and authentication

## Solutions (Explored)

### Selected: `meta` CLI (mateodelnorte/meta)

Use established `meta git clone` and `meta git pull` commands:

```bash
# In each project folder
cd projects/backend-services
meta git clone
meta git pull
```

**Benefits:**
- Proven tool (2.2k stars, production-tested)
- Handles authentication automatically
- Parallel cloning for speed
- Rich plugin ecosystem
- Standard Git workflow preserved

**Trade-offs:**
- External dependency (npm package)
- Requires Node.js runtime
- Limited to Git operations (no custom logic)

### Alternatives Considered

**Custom clone script:**
- Full control over behavior
- No external dependencies
- Requires reimplementing authentication, error handling, parallelization

**Git submodules:**
- Native Git feature
- Complex, brittle, poor UX

**harmony-labs/meta (Rust):**
- Too immature (no releases, 2 stars, created March 2025)

## Assumption Tests

- [ ] `meta git clone` works with SSH and HTTPS URLs
- [ ] Parallel cloning completes faster than sequential
- [ ] Authentication errors surface clearly
- [ ] Works with existing SSH agent configuration
- [ ] Can clone 10+ repos in reasonable time (<2 minutes)

## Implementation Notes

Scope: Documentation and workflow only. No custom tooling.

**Deliverables:**
- Installation instructions for `meta` CLI
- Workflow documentation for cloning/updating analysis sets
- Troubleshooting guide for common authentication issues

**Dependencies:** Repository definition (001)
**Blocks:** All analysis workflows
