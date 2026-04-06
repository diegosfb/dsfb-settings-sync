# Share your Antigravity (VS Code compatible) settings with DSFB Settings Sync 🚀

Version | Installs | Rating | OpenVSX | Downloads
--- | --- | --- | --- | ---
[![Version](https://img.shields.io/visual-studio-marketplace/v/diegosfb.dsfb-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=diegosfb.dsfb-settings-sync) | [![Installs](https://img.shields.io/visual-studio-marketplace/i/diegosfb.dsfb-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=diegosfb.dsfb-settings-sync) | [![Rating](https://img.shields.io/visual-studio-marketplace/r/diegosfb.dsfb-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=diegosfb.dsfb-settings-sync) | [![Open VSX](https://img.shields.io/open-vsx/v/soloboi/dsfb-settings-sync.svg)](https://open-vsx.org/extension/soloboi/dsfb-settings-sync) | [![Downloads](https://img.shields.io/open-vsx/dt/soloboi/dsfb-settings-sync.svg)](https://open-vsx.org/extension/soloboi/dsfb-settings-sync)

Share and sync your setup across devices with GitHub Gist. Built for **Antigravity**, fully compatible with **VS Code**.

## Share First (60 seconds)

1. Install the extension.
2. Run `dsfbSettingsSync.login`.
3. Run `dsfbSettingsSync.shareSettings`.
4. Copy the generated public Gist URL and share it.

## How Sharing Works

- `dsfbSettingsSync.shareSettings` creates a **public** share snapshot Gist.
- Sensitive values are masked before sharing (keys like token/secret/password and common credential patterns).
- You can copy the URL immediately and optionally rename your shared gist for better discoverability.

## Sync Quick Start

1. Install the extension.
2. Run `dsfbSettingsSync.login`.
3. Run `dsfbSettingsSync.uploadNow` to create/use a Gist, or `dsfbSettingsSync.setGistId` (accepts Gist ID or URL) + `dsfbSettingsSync.downloadNow` to pull from an existing Gist.
4. (Optional) Enable automatic sync by setting `dsfbSettingsSync.autoSync` to `true` (and `dsfbSettingsSync.autoSyncOnStartup` if you want startup downloads).

## Works With

- **Antigravity** (Tested & Recommended)
- VS Code (Compatible)

<details>
<summary><strong>Full Features & Reference (English)</strong></summary>

## Features

- **One-Click Synchronization**: Sync everything with a single command or button.
- **Share Your Settings**: Create a public share snapshot and copy a shareable URL instantly.
- **GitHub Gist Integration**: Securely store and version your configurations.
- **Auto-Backup**: Automatically creates local backups before applying remote changes.
- **Sync Preview / Diff**: Preview changes (and view local vs remote diff) before applying.
- **Selective Sync**: Toggle sync per category (settings, keybindings, extensions, snippets, Antigravity config).
- **Profile-Based Sync**: Use multiple sync profiles (Gist + ignore rules) and switch between them.
- **Ignored Items Manager**: Manage ignored settings and ignored extensions directly from the extension UI.
- **Extension Management**: Sync extensions with marketplace availability checks and optional cleanup of local-only extensions.
- **Smart Extension Removal**: Uninstalling an extension automatically prevents it from being reinstalled on the next sync, and its contributed settings are quietly added to the ignore list - no extra steps needed.
- **Marketplace Health Check**: Detects extensions in your sync list that have been removed or deprecated on the marketplace.
- **Custom Marketplaces**: Add OpenVSX-compatible marketplaces as fallbacks and check/install updates.
- **Private Extensions Helper**: Register private/unlisted extensions (VSIX URL / notes) for guided installs during sync.
- **Private Extension Cleanup**: Remove registered private extension entries directly from the extension UI.
- **Conflict-Safe Startup Sync**: On startup, if you have unsaved local changes newer than the remote Gist, local changes are uploaded first to prevent overwrite.
- **Authoritative Download Mode**: Optionally apply remote settings as the strict source of truth, removing any local keys not present in the remote.
- **Gist History**: Browse and rollback to previous configuration versions.

## Cross-Platform Note (VS Code <-> Antigravity)

- When syncing from Antigravity to VS Code, `antigravity.*` settings can be skipped.
- Antigravity-only files (`antigravity.json`, `browserAllowlist.txt`) are only applied on Antigravity.
- Omitted items are shown after sync in the report/output.

## Commands

Command | Description
--- | ---
`dsfbSettingsSync.login` | Login to GitHub to enable synchronization.
`dsfbSettingsSync.logout` | Logout from GitHub.
`dsfbSettingsSync.syncNow` | Perform a full sync (Upload & Download).
`dsfbSettingsSync.uploadNow` | Manually upload current local settings to Gist.
`dsfbSettingsSync.downloadNow` | Manually download and apply settings from Gist.
`dsfbSettingsSync.shareSettings` | Create a public share snapshot and copy its URL (sensitive values are masked).
`dsfbSettingsSync.showHistory` | Open the history of your settings Gist.
`dsfbSettingsSync.setGistId` | Set or clear the target Gist ID manually (Gist URL is also supported).
`dsfbSettingsSync.switchProfile` | Switch/create sync profiles.
`dsfbSettingsSync.configureIgnoredExtensions` | Select extensions to exclude from sync.
`dsfbSettingsSync.configureIgnoredSettings` | Select setting keys/patterns to exclude from sync.
`dsfbSettingsSync.checkExtensionHealth` | Check all synced extensions against the marketplace for availability.
`dsfbSettingsSync.runSettingsE2ETest` | Run an isolated VS Code launch to verify settings apply without errors.
`dsfbSettingsSync.showLocalVsRemoteDiff` | Show a preview diff (local vs current Gist) without applying changes.
`dsfbSettingsSync.togglePublicGist` | Toggle whether newly created Gists should be Public or Private (Secret).
`dsfbSettingsSync.setCustomMarketplaceUrl` | Set a single fallback marketplace URL (OpenVSX-compatible REST API).
`dsfbSettingsSync.addMarketplace` | Add a marketplace to the registry (recommended vs single URL for multiple fallbacks).
`dsfbSettingsSync.removeMarketplace` | Remove a marketplace from the registry.
`dsfbSettingsSync.reorderMarketplace` | Change marketplace scan order (fallback priority).
`dsfbSettingsSync.toggleCustomMarketplaceAutoUpdate` | Toggle auto-install of updates found in custom marketplaces.
`dsfbSettingsSync.checkCustomMarketplaceUpdates` | Check custom marketplaces for extension updates and install selected updates.
`dsfbSettingsSync.registerPrivateExtension` | Register a private/unlisted extension (VSIX URL / notes) for sync guidance.
`dsfbSettingsSync.removePrivateExtension` | Remove a registered private/unlisted extension entry.
`dsfbSettingsSync.openSettings` | Open the extension settings.
`dsfbSettingsSync.openRepository` | Open the GitHub repository.
`dsfbSettingsSync.reportIssue` | Report a bug / request a feature (GitHub issues).
`dsfbSettingsSync.showLog` | Open the log channel.
`dsfbSettingsSync.getStarted` | Open the Getting Started wizard.

## Keyboard Shortcuts

Shortcut | Command
--- | ---
`Shift+Alt+S` | `dsfbSettingsSync.syncNow`
`Shift+Alt+U` | `dsfbSettingsSync.uploadNow`
`Shift+Alt+D` | `dsfbSettingsSync.downloadNow`

## Settings

Setting | Default | Description
--- | --- | ---
`dsfbSettingsSync.gistId` | `""` | GitHub Gist ID for synchronization. Auto-created on first upload.
`dsfbSettingsSync.autoSync` | `false` | Master toggle for automatic sync behavior (startup sync + auto-upload watchers). Manual commands still work.
`dsfbSettingsSync.autoSyncOnStartup` | `false` | Automatically download and apply settings on startup (requires `dsfbSettingsSync.autoSync=true`).
`dsfbSettingsSync.autoUploadOnChange` | `true` | Automatically upload settings when local configuration changes (requires `dsfbSettingsSync.autoSync=true`).
`dsfbSettingsSync.autoUploadDelay` | `5000` | Delay (ms) before auto-uploading after a change.
`dsfbSettingsSync.syncPreview` | `true` | Show a sync preview (diff summary) before applying downloaded changes.
`dsfbSettingsSync.confirmExtensionSync` | `true` | Ask for confirmation before installing/uninstalling extensions during download.
`dsfbSettingsSync.gistTrust` | `{}` | Per-Gist trust setting. Untrusted gists block extension install/uninstall during download. Example: `{ "<gistId>": "trusted" }`.
`dsfbSettingsSync.ignoredSettings` | `["*token*", "*secret*", "*password*", "*apikey*", "*api_key*"]` | List of setting keys (glob patterns) to exclude from sync. Common secret-key patterns are included by default.
`dsfbSettingsSync.ignoredExtensions` | `[]` | List of extension IDs to exclude from sync.
`dsfbSettingsSync.removeExtensions` | `false` | Automatically uninstall extensions not present in the remote list.
`dsfbSettingsSync.publicGist` | `false` | Use Public Gist instead of Secret (Private) for storage.
`dsfbSettingsSync.syncSettings` | `true` | Sync `settings.json`.
`dsfbSettingsSync.syncExtensions` | `true` | Sync installed extensions list.
`dsfbSettingsSync.syncKeybindings` | `true` | Sync `keybindings.json`.
`dsfbSettingsSync.syncSnippets` | `true` | Sync user snippets.
`dsfbSettingsSync.syncStatusBarState` | `false` | Sync status bar UI state (hidden/reordered items) from `storage.json` when available.
`dsfbSettingsSync.statusBarItems` | `[]` | Optional list of status bar item IDs to include in `status-bar.json` for reference across machines.
`dsfbSettingsSync.syncAntigravityConfig` | `true` | Sync Antigravity-only files (`antigravity.json`, `browserAllowlist.txt`). Runtime default follows platform when unset.
`dsfbSettingsSync.authoritativeDownload` | `false` | When true, remote `settings.json` is treated as authoritative (keys absent in remote are removed locally).
`dsfbSettingsSync.profiles` | `{}` | Stored sync profiles (gistId, ignoredSettings, ignoredExtensions).
`dsfbSettingsSync.currentProfile` | `"Default"` | Currently active sync profile name.
`dsfbSettingsSync.customMarketplaceUrl` | `""` | A single custom marketplace base URL (OpenVSX-compatible REST API).
`dsfbSettingsSync.marketplaceRegistry` | `{}` | Custom marketplace registry (domain key → base URL).
`dsfbSettingsSync.marketplaceScanOrder` | `[]` | Domain keys defining the scan order for marketplace fallback (earlier entries checked first).
`dsfbSettingsSync.customMarketplaceAutoUpdate` | `false` | Automatically install updates found in custom marketplaces without prompting.
`dsfbSettingsSync.customMarketplaceUpdateCheck` | `"disabled"` | When to check for updates from custom marketplaces (`"startup"` or `"disabled"`).
`dsfbSettingsSync.privateExtensions` | `[]` | List of private/unlisted extensions for sync guidance (id, version, optional vsixUrl/localPath/note).

## Notes (Gist Trust)

## Tips (Status Bar IDs)

- Run the command `DSFB Settings Sync: Copy Status Bar Item IDs` to copy the IDs from `workbench.statusbar.hidden` (hide items first if needed).

- If the Gist is not owned by your currently logged-in GitHub account, extension install/uninstall is blocked by default.
- To allow extension changes for a specific Gist, set `dsfbSettingsSync.gistTrust` for that Gist ID to `"trusted"`.

## Security

- **Private by Default**: All sync Gists are created as Secret (Private) to ensure your settings are not public.
- **Secure Authentication**: Uses VS Code's built-in Authentication Provider; we never touch your password.

## Tech Stack

- TypeScript + VS Code Extension API
- Webpack bundling (`dist/extension.js`)
- GitHub Gist REST API (via Node.js `https`)
- VS Code Marketplace (`vsce`) + Open VSX (`ovsx`) publishing

---
</details>

## Antigravity 설정을 공유하세요 (VS Code 호환) with DSFB Settings Sync 🚀

DSFB Settings Sync는 **Antigravity** 중심으로 설계되었고, **VS Code**와도 호환됩니다. GitHub Gist로 설정을 공유하고 여러 기기에서 동기화할 수 있습니다.

## 공유 먼저 (60초)

1. 익스텐션 설치
2. `dsfbSettingsSync.login` 실행
3. `dsfbSettingsSync.shareSettings` 실행
4. 생성된 공개 Gist URL 복사 후 공유

## 공유 동작 방식

- `dsfbSettingsSync.shareSettings`는 **공개(public)** 공유 스냅샷 Gist를 생성합니다.
- 공유 전 민감값은 자동 마스킹됩니다(예: token/secret/password 및 주요 자격증명 패턴).
- URL 복사 후 바로 공유할 수 있고, 공유 Gist 이름도 원하는 형태로 바꿀 수 있습니다.

## 동기화 빠른 시작

1. 익스텐션 설치
2. `dsfbSettingsSync.login` 실행
3. 새 Gist로 시작하려면 `dsfbSettingsSync.uploadNow`, 기존 Gist에서 내려받으려면 `dsfbSettingsSync.setGistId`(Gist ID/URL 모두 지원) + `dsfbSettingsSync.downloadNow`
4. (선택) 자동 동기화를 쓰려면 `dsfbSettingsSync.autoSync`를 `true`로 설정 (시작 시 자동 다운로드는 `dsfbSettingsSync.autoSyncOnStartup`)

<details>
<summary><strong>전체 기능/명령어/설정 보기 (한국어)</strong></summary>

## 호환성 (Works With)

- **Antigravity** (권장 및 테스트 완료)
- VS Code (호환)

## 주요 기능

- **원클릭 동기화**: 버튼 하나나 명령어 입력만으로 모든 설정을 동기화합니다.
- **설정 공유 링크 생성**: 공유용 공개 스냅샷을 만들고 URL을 즉시 복사할 수 있습니다.
- **GitHub Gist 통합**: 보안이 강화된 Gist에 설정을 버전별로 저장합니다.
- **자동 백업**: 원격 설정을 적용하기 전에 로컬에 자동 백업을 생성합니다.
- **미리보기 / Diff**: 적용 전 변경사항 미리보기 및 로컬 vs 원격 Diff 확인이 가능합니다.
- **선택적 동기화**: 설정/단축키/익스텐션/스니펫/Antigravity 전용 파일 단위로 동기화를 켜고 끌 수 있습니다.
- **프로필 기반 동기화**: Gist/무시 목록을 프로필로 저장하고 전환할 수 있습니다.
- **무시 항목 관리 UI**: 동기화에서 제외할 설정 키/익스텐션을 UI에서 바로 관리할 수 있습니다.
- **익스텐션 관리**: 마켓플레이스 가용성 확인 후 설치를 시도하고, 필요 시 로컬 초과 익스텐션을 정리합니다.
- **스마트 익스텐션 제거**: 익스텐션을 제거하면 다음 동기화 시 자동 재설치가 차단되고, 해당 익스텐션의 설정 키도 조용히 무시 목록에 추가됩니다. 별도 조작이 필요하지 않습니다.
- **마켓플레이스 헬스체크**: 동기화 목록의 익스텐션 중 마켓플레이스에서 삭제되거나 deprecated된 항목을 자동으로 탐지합니다.
- **커스텀 마켓플레이스**: OpenVSX 호환 마켓을 추가해 fallback 검색/업데이트를 지원합니다.
- **Private 익스텐션 도우미**: 비공개/미등록 익스텐션을 등록(VSIX URL/메모)해 동기화 시 설치 가이드를 제공합니다.
- **Private 익스텐션 정리**: 등록된 Private 익스텐션 항목을 UI에서 바로 제거할 수 있습니다.
- **충돌 안전 스타트업 동기화**: 시작 시 로컬 변경사항이 원격 Gist보다 최신이면, 덮어쓰기를 방지하기 위해 로컬을 먼저 업로드합니다.
- **권한적 다운로드 모드**: 원격 설정을 엄격한 기준으로 적용해 원격에 없는 로컬 키를 자동 제거합니다.
- **동기화 기록**: Gist 히스토리를 통해 이전 설정 버전으로 되돌릴 수 있습니다.

## VS Code <-> 안티그래비티 연동 안내

- 안티그래비티에서 VS Code로 동기화할 때 `antigravity.*` 설정은 일부 제외될 수 있습니다.
- 안티그래비티 전용 파일(`antigravity.json`, `browserAllowlist.txt`)은 안티그래비티 환경에서만 적용됩니다.
- 누락/제외된 항목은 동기화 후 리포트(Output)에서 안내됩니다.

## 명령어

명령어 | 설명
--- | ---
`dsfbSettingsSync.login` | 동기화를 위해 GitHub에 로그인합니다.
`dsfbSettingsSync.logout` | GitHub에서 로그아웃합니다.
`dsfbSettingsSync.syncNow` | 전체 동기화(업로드 및 다운로드)를 수행합니다.
`dsfbSettingsSync.uploadNow` | 현재 로컬 설정을 Gist에 수동으로 업로드합니다.
`dsfbSettingsSync.downloadNow` | Gist에서 설정을 수동으로 다운로드하여 적용합니다.
`dsfbSettingsSync.shareSettings` | 공유용 공개 스냅샷을 만들고 URL을 복사합니다(민감값은 마스킹).
`dsfbSettingsSync.showHistory` | 설정 Gist의 히스토리를 확인합니다.
`dsfbSettingsSync.setGistId` | 사용할 Gist ID를 수동으로 지정/초기화합니다(Gist URL도 지원).
`dsfbSettingsSync.switchProfile` | 동기화 프로필을 전환하거나 새로 만듭니다.
`dsfbSettingsSync.configureIgnoredExtensions` | 동기화에서 제외할 익스텐션을 선택합니다.
`dsfbSettingsSync.configureIgnoredSettings` | 동기화에서 제외할 설정 키/패턴을 선택합니다.
`dsfbSettingsSync.checkExtensionHealth` | 동기화된 익스텐션의 마켓플레이스 가용성을 확인합니다.
`dsfbSettingsSync.runSettingsE2ETest` | 격리된 VS Code 환경에서 설정 적용 오류를 사전에 탐지합니다.
`dsfbSettingsSync.showLocalVsRemoteDiff` | 적용 없이 로컬 vs 현재 Gist의 Diff(미리보기)를 확인합니다.
`dsfbSettingsSync.togglePublicGist` | 새로 생성되는 Gist를 Public/Private(Secret)로 전환합니다.
`dsfbSettingsSync.setCustomMarketplaceUrl` | 단일 커스텀 마켓플레이스 URL(OpenVSX 호환 API)을 설정합니다.
`dsfbSettingsSync.addMarketplace` | 마켓플레이스(여러 fallback용) URL을 추가합니다.
`dsfbSettingsSync.removeMarketplace` | 등록된 마켓플레이스를 삭제합니다.
`dsfbSettingsSync.reorderMarketplace` | 마켓플레이스 검색 우선순위(Scan Order)를 변경합니다.
`dsfbSettingsSync.toggleCustomMarketplaceAutoUpdate` | 커스텀 마켓 업데이트 자동 설치를 토글합니다.
`dsfbSettingsSync.checkCustomMarketplaceUpdates` | 커스텀 마켓에서 업데이트를 확인하고 선택 설치합니다.
`dsfbSettingsSync.registerPrivateExtension` | Private/미등록 익스텐션을 등록(VSIX URL/메모)합니다.
`dsfbSettingsSync.removePrivateExtension` | 등록된 Private/미등록 익스텐션 항목을 제거합니다.
`dsfbSettingsSync.openSettings` | 익스텐션 설정을 엽니다.
`dsfbSettingsSync.openRepository` | GitHub 저장소를 엽니다.
`dsfbSettingsSync.reportIssue` | 버그/기능요청 이슈를 등록합니다(GitHub).
`dsfbSettingsSync.showLog` | 로그(출력 채널)를 엽니다.
`dsfbSettingsSync.getStarted` | Getting Started 마법사를 엽니다.

## 단축키

단축키 | 명령어
--- | ---
`Shift+Alt+S` | `dsfbSettingsSync.syncNow`
`Shift+Alt+U` | `dsfbSettingsSync.uploadNow`
`Shift+Alt+D` | `dsfbSettingsSync.downloadNow`

## 설정

설정과 이름 | 기본값 | 설명
--- | --- | ---
`dsfbSettingsSync.gistId` | `""` | 동기화에 사용할 GitHub Gist ID. 첫 업로드 시 자동 생성됩니다.
`dsfbSettingsSync.autoSync` | `false` | 자동 동기화(시작 시 동기화 + 변경 감지 업로드)의 마스터 토글입니다. 수동 명령어는 항상 동작합니다.
`dsfbSettingsSync.autoSyncOnStartup` | `false` | 시작 시 자동 다운로드/적용 (requires `dsfbSettingsSync.autoSync=true`).
`dsfbSettingsSync.autoUploadOnChange` | `true` | 설정 변경 시 자동 업로드 (requires `dsfbSettingsSync.autoSync=true`).
`dsfbSettingsSync.autoUploadDelay` | `5000` | 변경 감지 후 자동 업로드 대기 시간(ms).
`dsfbSettingsSync.syncPreview` | `true` | 다운로드 적용 전 변경사항 미리보기(요약 diff)를 보여줍니다.
`dsfbSettingsSync.confirmExtensionSync` | `true` | 다운로드 시 익스텐션 설치/삭제 전에 확인을 요청합니다.
`dsfbSettingsSync.gistTrust` | `{}` | Gist 신뢰도 설정. 신뢰되지 않은 Gist는 익스텐션 설치/삭제가 기본적으로 차단됩니다. 예: `{ "<gistId>": "trusted" }`.
`dsfbSettingsSync.ignoredSettings` | `["*token*", "*secret*", "*password*", "*apikey*", "*api_key*"]` | 동기화에서 제외할 설정 키 목록(glob 패턴 지원). 시크릿 키 패턴이 기본으로 포함되어 있습니다.
`dsfbSettingsSync.ignoredExtensions` | `[]` | 동기화에서 제외할 익스텐션 ID 목록입니다.
`dsfbSettingsSync.removeExtensions` | `false` | 원격 목록에 없는 로컬 익스텐션을 자동으로 삭제합니다.
`dsfbSettingsSync.authoritativeDownload` | `false` | true이면 원격 설정을 완전한 기준으로 적용합니다. 원격에 없는 로컬 키는 삭제됩니다.
`dsfbSettingsSync.publicGist` | `false` | Gist를 비밀(Secret) 대신 공개(Public)로 생성합니다.
`dsfbSettingsSync.syncSettings` | `true` | `settings.json` 동기화 여부.
`dsfbSettingsSync.syncExtensions` | `true` | 설치된 익스텐션 목록 동기화 여부.
`dsfbSettingsSync.syncKeybindings` | `true` | `keybindings.json` 동기화 여부.
`dsfbSettingsSync.syncSnippets` | `true` | 사용자 스니펫 동기화 여부.
`dsfbSettingsSync.syncStatusBarState` | `false` | `storage.json`에 저장된 상태바 UI 상태(숨김/정렬) 동기화 여부.
`dsfbSettingsSync.syncAntigravityConfig` | `true` | Antigravity 전용 파일(`antigravity.json`, `browserAllowlist.txt`) 동기화 여부. 미설정 시 실행 환경 기준 기본값이 적용됩니다.
`dsfbSettingsSync.profiles` | `{}` | 프로필별 동기화 정보(gistId, ignoredSettings, ignoredExtensions)를 저장합니다.
`dsfbSettingsSync.currentProfile` | `"Default"` | 현재 활성화된 동기화 프로필 이름입니다.
`dsfbSettingsSync.customMarketplaceUrl` | `""` | 단일 커스텀 마켓플레이스 URL(OpenVSX 호환 REST API)입니다.
`dsfbSettingsSync.marketplaceRegistry` | `{}` | 커스텀 마켓플레이스 레지스트리(도메인 키 → URL).
`dsfbSettingsSync.marketplaceScanOrder` | `[]` | fallback 검색 우선순위를 정의하는 도메인 키 목록(앞에 있을수록 우선).
`dsfbSettingsSync.customMarketplaceAutoUpdate` | `false` | 커스텀 마켓에서 발견된 업데이트를 확인 없이 자동 설치합니다.
`dsfbSettingsSync.customMarketplaceUpdateCheck` | `"disabled"` | 커스텀 마켓 업데이트 자동 확인 시점(`"startup"` 또는 `"disabled"`).
`dsfbSettingsSync.privateExtensions` | `[]` | Private/미등록 익스텐션 목록(동기화 가이드용: id, version, optional vsixUrl/localPath/note).

## 참고 (Gist Trust)

- 현재 로그인 계정이 소유하지 않은 Gist는 기본적으로 익스텐션 설치/삭제가 차단됩니다.
- 특정 Gist에서 익스텐션 변경을 허용하려면 해당 Gist ID를 `dsfbSettingsSync.gistTrust`에 `"trusted"`로 등록하세요.

## 보안

- **기본 비밀 설정**: 모든 동기화용 Gist는 기본적으로 비밀(Secret)로 생성되어 안전합니다.
- **안전한 인증**: VS Code의 내장 인증 기능을 사용하며, 사용자의 비밀번호에 절대 접근하지 않습니다.

## 기술 스택

- TypeScript + VS Code Extension API
- Webpack 번들링 (`dist/extension.js`)
- GitHub Gist REST API (Node.js `https`)
- VS Code Marketplace(`vsce`) + Open VSX(`ovsx`) 배포

---
</details>
