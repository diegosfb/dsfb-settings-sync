# Changelog

All notable changes to Soloboi's Settings Sync are documented here.

---

## [Unreleased]

_Add changes for the next release here._

<details>
<summary>한국어 (요약)</summary>

_다음 릴리즈에 포함될 변경사항을 여기에 작성하세요._

</details>

---
## [1.1.8] - 2026-04-03

### Added
- Share flow (`shareSettings`) for public settings snapshots with masked sensitive values and instant URL sharing.
- Local vs Remote diff view in VS Code built-in diff editor, plus sync preview before applying.
- Profile-based sync, custom marketplace registry/update checks, and private extension registration/removal.
- Getting Started wizard and dedicated log channel.

### Improved
- Sidebar/action UX reorganized (collapsible groups, clearer tooltips, better command discoverability).
- Startup/download safety (trust gate, conflict-safe startup sync, authoritative download mode).
- Sensitive-data masking coverage and fallback behavior on parse failure.

### Changed
- `setGistId` now accepts both Gist ID and full Gist URL.
- README was redesigned as a landing-first guide (share/sync quick start first).
- Repository housekeeping updates (local script tracking policy and `.gitignore` cleanup).
- Notes from 2026-04-02 ~ 2026-04-03 are unified into this single patch release.

<details>
<summary>한국어 (요약)</summary>

### 추가
- `shareSettings` 기반 공개 설정 공유 흐름(민감정보 마스킹 + URL 즉시 공유)을 추가했습니다.
- VS Code 내장 diff 기반 로컬/원격 비교 및 적용 전 미리보기 기능을 강화했습니다.
- 프로필 기반 동기화, 커스텀 마켓플레이스 레지스트리/업데이트 확인, Private 익스텐션 등록/삭제를 지원합니다.
- 시작 마법사(Getting Started)와 전용 로그 채널을 추가했습니다.

### 개선
- 사이드바/액션 UX를 재구성했습니다(접이식 섹션, 툴팁/명령 발견성 개선).
- 시작 시 동기화 안정성을 강화했습니다(신뢰도 게이트, 충돌 방지 스타트업 동기화, authoritative download).
- 민감정보 마스킹 범위와 파싱 실패 시 fallback 동작을 보강했습니다.

### 변경
- `setGistId`가 Gist ID뿐 아니라 전체 Gist URL도 입력받습니다.
- README를 랜딩 우선 구조(공유/동기화 빠른 시작 중심)로 재정리했습니다.
- 저장소 내부 정리(`.gitignore`/로컬 스크립트 추적 정책)를 반영했습니다.
- 2026-04-02 ~ 2026-04-03 변경 내역은 이 단일 패치 릴리즈로 통합했습니다.

</details>

---

## [1.0.16] - 2026-03-23

### Added
- **Smart Extension Removal**: Uninstalling an extension now automatically prevents it from being reinstalled on the next sync. No extra steps needed — the extension tracks your intent silently.
- **Auto-ignore on Uninstall**: When an extension is removed, its contributed settings keys are automatically added to `ignoredSettings` so they no longer pollute synced configurations.
- **Marketplace Health Check** (`soloboisSettingsSync.checkExtensionHealth`): Scans all extensions in your sync list against the VS Code Marketplace and reports any that are missing or deprecated.
- **Settings E2E Test** (`soloboisSettingsSync.runSettingsE2ETest`): Launches an isolated VS Code instance with your current settings to detect errors before they reach other devices.
- **Conflict-Safe Startup Sync**: On startup, if local changes are newer than the remote Gist, local state is uploaded first instead of being overwritten.
- **Authoritative Download Mode** (`soloboisSettingsSync.authoritativeDownload`): When enabled, remote settings are applied as the strict source of truth — local keys absent in the remote are removed.
- **Default Secret Key Filters**: `ignoredSettings` now ships with common secret-key patterns (`*token*`, `*secret*`, `*password*`, `*apikey*`, `*api_key*`) to prevent accidental credential sync.

### Improved
- **Extension Install Reliability**: VS Code's built-in install API is now tried first; CLI (`code --install-extension`) is used only as a fallback, fixing install failures on Antigravity and non-standard environments.
- **Gist API Robustness**: Added request timeout (15s), automatic retry with backoff (up to 2 retries) for network errors and rate limits, and pagination support for users with large Gist collections (up to 500 Gists).
- **Stale Gist File Cleanup**: Files removed from a sync profile are now automatically deleted from the Gist on the next upload, keeping the remote clean.
- **Auto-upload Race Condition Fix**: Downloads now suppress auto-upload triggers for a brief window after applying remote changes, preventing unnecessary upload/download loops.
- **Extension Change Detection**: Auto-upload on extension install/uninstall now correctly diffs the before/after snapshot, avoiding false triggers.

<details>
<summary>한국어 (요약)</summary>

- 익스텐션 제거 의도 추적 + 설정 키 자동 ignore
- 마켓 헬스체크 + 격리 E2E 테스트 추가
- 시작 시 충돌 방지(로컬이 최신이면 선업로드)
- 다운로드 권한 모드 + 기본 시크릿 패턴 필터
- 설치/Gist API/정리/레이스 컨디션 안정화

</details>

---

## [1.0.15] - 2026-03-16

### Added
- VS Code compatibility (previously Antigravity-only).
- Profile management: save and switch between multiple sync profiles, each with its own Gist ID and ignore rules.
- Configurable ignored settings and extensions per profile.
- Cross-platform filtering: `antigravity.*` settings and Antigravity-only files are skipped when syncing to VS Code.

<details>
<summary>한국어 (요약)</summary>

- VS Code 호환 추가
- 다중 프로필(각각 Gist/무시 규칙) 지원
- 프로필별 ignored settings/extensions 지원
- VS Code로 동기화 시 Antigravity 전용 항목 제외

</details>

---

## [1.0.14] - 2026-03-05

### Added
- Initial release with core sync functionality.
- GitHub Gist integration via VS Code's built-in GitHub authentication (no PAT required).
- Sync for `settings.json`, `keybindings.json`, user snippets, and extensions list.
- Auto-upload on file change, auto-download on startup.
- Gist history browser with rollback support.
- Ignored items manager UI for settings keys and extension IDs.
- Status bar indicator (idle / uploading / downloading / error).

<details>
<summary>한국어 (요약)</summary>

- 최초 릴리즈: Gist 기반 설정/단축키/스니펫/익스텐션 동기화
- 자동 업/다운 + 히스토리/롤백 + 무시 목록 UI + 상태바

</details>
