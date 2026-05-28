# Changelog

All notable changes to the English Parkour Classroom Game project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-05-28

### Added — Phase 1: Assets & Architecture Design
- **Image Asset Strategy** — Sprite sheet consolidation reducing API calls by 59% (21 vs 51)
  - Character sprite sheets (running 8-frame + poses 5-in-1)
  - Item icons strip (5道具合一)
  - City map backgrounds (far/mid/near layers)
  - VFX effects strip (electric/rocket/dust/shield)
  - UI atlas (logo/buttons/panels/progress/crowns)
  - Obstacles strip
- **Web Audio API Sound Generator** — Zero audio files, 8-bit procedural synthesis
  - 12 sound effects: correct, wrong, countdown, victory, rocket, electric, banana, shield, etc.
  - Lazy singleton pattern with AudioContext
- **Color Config System** — 8 player colors with Phaser tint support
- **Map/Camera Display Architecture**
  - Student follow camera (±15% viewport with edge arrows)
  - Teacher 3-mode camera (cluster/full/follow) with sliding window cluster detection
  - Risk analysis: confirmed zero server load, client-side only

### Added — Phase 2: Server Core Implementation
- **Database** — Expanded from 10 to 40 words across grades 3-6
- **Game Logic Modules**
  - `GameRoom.js` — State machine with lookup-table dispatch, O(1) Map lookups
  - `WordEngine.js` — Pre-indexed word DB, Fisher-Yates selection, weighted random
  - `ItemSystem.js` — Registry-driven, zero branches (rocket/electric/banana/shield)
- **Stability Architecture** (9+ client support)
  - `Heartbeat.js` — 5s ping/8s timeout/2 missed=zombie/15s cleanup
  - `RateLimiter.js` — Token bucket (50 req/s)
  - `ErrorBoundary.js` — Global exception handling
  - `GracefulShutdown.js` — SIGTERM handling with room state save
- **Word Import System** — Multi-format support
  - `ImportRouter.js` — Session-based upload with 30min TTL
  - `DocxParser.js` — mammoth extraction
  - `PdfParser.js` — pdf-parse text extraction
  - `ImageParser.js` — sharp preprocessing + Tesseract OCR (eng+chi_sim)
  - `TextParser.js` — 6-pattern smart format detection
  - `WordExtractor.js` — Word-meaning pair extraction
  - `WordNormalizer.js` — Auto blank_pattern generation, difficulty inference
  - `ImportValidator.js` — Duplicate detection, preview generation

### Added — Phase 3: Client Implementation
- **Scenes**
  - `BootScene.js` — Asset loading with sprite sheet parsing
  - `MenuScene.js` — Name/room input with validation
  - `LobbyScene.js` — Player list, ready button, room code display
  - `GameScene.js` — Complete parkour + quiz + items multiplayer
    - Follow camera (30% viewport), mini progress bar, virtual keyboard
    - Item effects (lightning, rocket trail, banana slip, shield bubble)
    - Edge arrows for off-screen players, 3-2-1-GO countdown
  - `TeacherScene.js` — Big screen with 3-mode camera
    - Cluster mode (sliding window), Full mode, Follow mode
    - Real-time ranking panel, event log, control bar
  - `ResultScene.js` — Rankings, stats, replay button
- **Stability Modules**
  - `ConnectionManager.js` — WebSocket state machine + exponential backoff
  - `StateReconciler.js` — Post-reconnect snapshot recovery
  - `OfflineDetector.js` — 3-signal fusion (browser/probe/heartbeat)
  - `MessageQueue.js` — Offline message buffering + replay

### Added — Phase 4: Data & Integration
- **Database Seed Data** — 40 words (10 per grade: 3,4,5,6)
- **Dependencies** — multer, mammoth, pdf-parse, sharp, tesseract.js

### Technical Archive
- Algorithm-level code architecture with functional programming patterns
- Zero deep nesting, Map/Set O(1) lookups, guard clauses, pipeline composition
- State machines with lookup-table dispatch (no switch/if-else chains)
- Comprehensive inline documentation and JSDoc

### Repository
- Initial commit: project scaffold from `english-parkour.zip`
- Git repository initialized at `english-parkour/`
- Branch strategy: `main` (stable) + feature branches per update phase
- All 35+ planned files created/modified
