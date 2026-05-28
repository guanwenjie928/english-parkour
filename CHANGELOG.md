# Changelog

All notable changes to the English Parkour Classroom Game project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-28

### Added — Project Scaffold
- Complete game design documentation (5 docs: core gameplay, architecture, database, API spec, client design)
- MySQL database schema with 6 tables, 1 view, and 10 seed words
- Server skeleton (Express + Socket.io) with REST API stubs
- Client skeleton (Phaser 3 + Vite) with 4 scene stubs (Boot, Menu, Game, Result)
- Asset generation prompts (Leonardo.ai for images, ElevenLabs for audio)
- Comprehensive implementation plan (`/plans/dreamy-doodling-hamster.md`)
  - 4-phase plan covering assets, server, client, and data
  - Algorithm-level code architecture with optimization standards
  - Multi-client stability architecture (heartbeat, rate limiting, graceful shutdown, reconnection)
  - ~30 files planned for creation/modification

### Repository
- Initial commit: project scaffold from `english-parkour.zip`
- Git repository initialized
- Branch strategy: `main` (stable) + feature branches per update phase
