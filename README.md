# Ainalyzer

Interactive treemap visualization for exploring code volume and change patterns across multiple repositories.

Point the tool at a local folder containing one or more Git repositories. Analysis runs entirely on your machine - no data is sent anywhere.

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
# First time: provide path (registers and analyzes)
./aina analyze myproject /path/to/repos

# Re-analyze (uses stored path)
./aina analyze myproject

# View results in browser
./aina serve
```

### Commands

```
./aina analyze <name> [path]   Analyze repos (path required first time)
./aina list                    List registered analysis sets
./aina remove <name>           Remove analysis set
./aina serve [-p PORT]         Serve frontend (default: port 8080)
```

### Docker (alternative)

No local installation required - just Docker.

```bash
# Build image
docker build -t ainalyzer .

# Analyze repos (mount your repos folder and persist data)
docker run --rm -v /path/to/repos:/repos -v ~/.aina:/root/.aina ainalyzer \
    ./aina analyze myproject /repos

# Serve results (mount repos for file viewer and clocignore support)
docker run --rm -p 8080:8080 -v /path/to/repos:/repos -v ~/.aina:/root/.aina ainalyzer
```

Open http://localhost:8080 to view.

---

For development, see [DEVELOPMENT.md](./DEVELOPMENT.md).
