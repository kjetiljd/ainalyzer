# Ainalyzer

Interactive treemap visualization for exploring code volume and change patterns across multiple repositories.

> **Note:** Only tested on macOS.

## Usage

### Prerequisites
```bash
# Required tools
git --version      # Git for repository analysis
python3 --version  # Python 3.10+
node --version     # Node.js 18+ (for frontend build)
cloc --version     # Install: brew install cloc
```

### Setup

```bash
git clone https://github.com/kjetiljd/ainalyzer.git
cd ainalyzer

# Build frontend (one-time)
cd frontend && npm install && npm run build && cd ..
```

### Analyze repositories

```bash
# Register a folder containing Git repos
./aina add myproject /path/to/repos

# Run analysis (generates ~/.aina/analysis/myproject.json)
./aina analyze myproject

# View results in browser
./aina serve
```

### Commands

```
./aina add <name> <path>   Register folder as analysis set
./aina list                List registered analysis sets
./aina remove <name>       Remove analysis set
./aina analyze <name>      Run analysis and generate JSON
./aina serve [-p PORT]     Serve frontend (default: port 8080)
```

### Docker (alternative)

No local installation required - just Docker.

```bash
# Build image
docker build -t ainalyzer .

# Analyze repos (mount your repos folder and persist data)
docker run --rm -v /path/to/repos:/repos -v ~/.aina:/root/.aina ainalyzer \
    ./aina add myproject /repos

docker run --rm -v /path/to/repos:/repos -v ~/.aina:/root/.aina ainalyzer \
    ./aina analyze myproject

# Serve results
docker run --rm -p 8080:8080 -v ~/.aina:/root/.aina ainalyzer
```

Open http://localhost:8080 to view.

---

## Documentation Structure

This project follows a structured approach to documentation:

### [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md)
Complete product vision, strategy, and technical architecture. Defines the problem space, target users, features, success metrics, and implementation roadmap.

### [PLAN.md](./PLAN.md)
Current development plan using Now/Next/Later format. Always shows exactly one active task in "Now," upcoming work in "Next," and references the product brief for "Later."

### [docs/adr/](./docs/adr/)
Architecture Decision Records (ADRs) using Michael Nygard format. Documents significant architectural and technical decisions with context, rationale, and consequences. Numbered sequentially (0001, 0002, etc.).

### [docs/opportunities/](./docs/opportunities/)
Opportunity documentation following Opportunity Solution Tree methodology. Each opportunity describes a problem/need (opportunity space), desired outcomes, potential solutions, and assumption tests.

**Numbering system:** Uses Zettelkasten-style branching (Luhmann's Folgezettel) to show relationships. Child opportunities branch from parents using alternating numbers and letters:
- `001` = top-level opportunity
- `001a` = builds on/depends on 001
- `001b` = another branch from 001
- `001a1` = deeper branch from 001a

This shows dependency relationships directly in the numbering without requiring renumbering when adding new opportunities.

## Architecture

- **Backend:** Python CLI (`aina`) with zero external dependencies
- **Frontend:** Vue.js 3 + D3.js treemap visualization
- **Storage:** SQLite for analysis sets, JSON for analysis results
- **External tools:** cloc (line counting), Git CLI
