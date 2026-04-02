# Soloboi's Settings Sync for Antigravity 🚀

Version | Installs | Rating | OpenVSX | Downloads
--- | --- | --- | --- | ---
[![Version](https://img.shields.io/visual-studio-marketplace/v/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Installs](https://img.shields.io/visual-studio-marketplace/i/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Rating](https://img.shields.io/visual-studio-marketplace/r/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Open VSX](https://img.shields.io/open-vsx/v/soloboi/solobois-settings-sync.svg)](https://open-vsx.org/extension/soloboi/solobois-settings-sync) | [![Downloads](https://img.shields.io/open-vsx/dt/soloboi/solobois-settings-sync.svg)](https://open-vsx.org/extension/soloboi/solobois-settings-sync)

Soloboi's Settings Sync is primarily designed for **Antigravity**. It allows you to seamlessly synchronize your settings, keybindings, extensions, and snippets across multiple devices using GitHub Gist.

## Works With

- **Antigravity** (Tested & Recommended)
- VS Code (Compatible)

## Features

- **One-Click Synchronization**: Sync everything with a single command or button.
- **GitHub Gist Integration**: Securely store and version your configurations.
- **Auto-Backup**: Automatically creates local backups before applying remote changes.
- **Selective Sync**: Toggle sync per category (settings, keybindings, extensions, snippets, Antigravity config).
- **Profile-Based Sync**: Use multiple sync profiles (Gist + ignore rules) and switch between them.
- **Ignored Items Manager**: Manage ignored settings and ignored extensions directly from the extension UI.
- **Extension Management**: Sync extensions with marketplace availability checks and optional cleanup of local-only extensions.
- **Smart Extension Removal**: Uninstalling an extension automatically prevents it from being reinstalled on the next sync, and its contributed settings are quietly added to the ignore list - no extra steps needed.
- **Marketplace Health Check**: Detects extensions in your sync list that have been removed or deprecated on the marketplace.
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
`soloboisSettingsSync.login` | Login to GitHub to enable synchronization.
`soloboisSettingsSync.logout` | Logout from GitHub.
`soloboisSettingsSync.syncNow` | Perform a full sync (Upload & Download).
`soloboisSettingsSync.uploadNow` | Manually upload current local settings to Gist.
`soloboisSettingsSync.downloadNow` | Manually download and apply settings from Gist.
`soloboisSettingsSync.showHistory` | Open the history of your settings Gist.
`soloboisSettingsSync.setGistId` | Set or clear the target Gist ID manually.
`soloboisSettingsSync.switchProfile` | Switch/create sync profiles.
`soloboisSettingsSync.configureIgnoredExtensions` | Select extensions to exclude from sync.
`soloboisSettingsSync.configureIgnoredSettings` | Select setting keys/patterns to exclude from sync.
`soloboisSettingsSync.checkExtensionHealth` | Check all synced extensions against the marketplace for availability.
`soloboisSettingsSync.runSettingsE2ETest` | Run an isolated VS Code launch to verify settings apply without errors.

## Settings

Setting | Default | Description
--- | --- | ---
`soloboisSettingsSync.gistId` | `""` | GitHub Gist ID for synchronization. Auto-created on first upload.
`soloboisSettingsSync.autoSyncOnStartup` | `true` | Automatically download and apply settings on startup.
`soloboisSettingsSync.autoUploadOnChange` | `true` | Automatically upload settings when local configuration changes.
`soloboisSettingsSync.autoUploadDelay` | `5000` | Delay (ms) before auto-uploading after a change.
`soloboisSettingsSync.ignoredSettings` | `["*token*", "*secret*", "*password*", "*apikey*", "*api_key*"]` | List of setting keys (glob patterns) to exclude from sync. Common secret-key patterns are included by default.
`soloboisSettingsSync.ignoredExtensions` | `[]` | List of extension IDs to exclude from sync.
`soloboisSettingsSync.removeExtensions` | `false` | Automatically uninstall extensions not present in the remote list.
`soloboisSettingsSync.authoritativeDownload` | `false` | When true, remote settings overwrite local completely (keys absent in remote are removed locally).
`soloboisSettingsSync.publicGist` | `false` | Use Public Gist instead of Secret (Private) for storage.
`soloboisSettingsSync.syncSettings` | `true` | Sync `settings.json`.
`soloboisSettingsSync.syncExtensions` | `true` | Sync installed extensions list.
`soloboisSettingsSync.syncKeybindings` | `true` | Sync `keybindings.json`.
`soloboisSettingsSync.syncSnippets` | `true` | Sync user snippets.
`soloboisSettingsSync.syncAntigravityConfig` | `true` | Sync Antigravity-only files (`antigravity.json`, `browserAllowlist.txt`). Runtime default follows platform when unset.
`soloboisSettingsSync.profiles` | `{}` | Stored sync profiles (gistId, ignoredSettings, ignoredExtensions).
`soloboisSettingsSync.currentProfile` | `"Default"` | Currently active sync profile name.

## Security

- **Private by Default**: All sync Gists are created as Secret (Private) to ensure your settings are not public.
- **Secure Authentication**: Uses VS Code's built-in Authentication Provider; we never touch your password.

---

### Happy Coding! 😊

## Soloboi's Settings Sync for Antigravity (한국어) 🚀

Soloboi's Settings Sync는 **Antigravity**를 위해 설계된 익스텐션으로, 여러 기기 간에 설정, 단축키, 익스텐션, 스니펫을 GitHub Gist를 통해 완벽하게 동기화합니다.

## 호환성 (Works With)

- **Antigravity** (권장 및 테스트 완료)
- VS Code (호환)

## 주요 기능

- **원클릭 동기화**: 버튼 하나나 명령어 입력만으로 모든 설정을 동기화합니다.
- **GitHub Gist 통합**: 보안이 강화된 Gist에 설정을 버전별로 저장합니다.
- **자동 백업**: 원격 설정을 적용하기 전에 로컬에 자동 백업을 생성합니다.
- **선택적 동기화**: 설정/단축키/익스텐션/스니펫/Antigravity 전용 파일 단위로 동기화를 켜고 끌 수 있습니다.
- **프로필 기반 동기화**: Gist/무시 목록을 프로필로 저장하고 전환할 수 있습니다.
- **무시 항목 관리 UI**: 동기화에서 제외할 설정 키/익스텐션을 UI에서 바로 관리할 수 있습니다.
- **익스텐션 관리**: 마켓플레이스 가용성 확인 후 설치를 시도하고, 필요 시 로컬 초과 익스텐션을 정리합니다.
- **스마트 익스텐션 제거**: 익스텐션을 제거하면 다음 동기화 시 자동 재설치가 차단되고, 해당 익스텐션의 설정 키도 조용히 무시 목록에 추가됩니다. 별도 조작이 필요하지 않습니다.
- **마켓플레이스 헬스체크**: 동기화 목록의 익스텐션 중 마켓플레이스에서 삭제되거나 deprecated된 항목을 자동으로 탐지합니다.
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
`soloboisSettingsSync.login` | 동기화를 위해 GitHub에 로그인합니다.
`soloboisSettingsSync.logout` | GitHub에서 로그아웃합니다.
`soloboisSettingsSync.syncNow` | 전체 동기화(업로드 및 다운로드)를 수행합니다.
`soloboisSettingsSync.uploadNow` | 현재 로컬 설정을 Gist에 수동으로 업로드합니다.
`soloboisSettingsSync.downloadNow` | Gist에서 설정을 수동으로 다운로드하여 적용합니다.
`soloboisSettingsSync.showHistory` | 설정 Gist의 히스토리를 확인합니다.
`soloboisSettingsSync.setGistId` | 사용할 Gist ID를 수동으로 지정/초기화합니다.
`soloboisSettingsSync.switchProfile` | 동기화 프로필을 전환하거나 새로 만듭니다.
`soloboisSettingsSync.configureIgnoredExtensions` | 동기화에서 제외할 익스텐션을 선택합니다.
`soloboisSettingsSync.configureIgnoredSettings` | 동기화에서 제외할 설정 키/패턴을 선택합니다.
`soloboisSettingsSync.checkExtensionHealth` | 동기화된 익스텐션의 마켓플레이스 가용성을 확인합니다.
`soloboisSettingsSync.runSettingsE2ETest` | 격리된 VS Code 환경에서 설정 적용 오류를 사전에 탐지합니다.

## 설정

설정과 이름 | 기본값 | 설명
--- | --- | ---
`soloboisSettingsSync.gistId` | `""` | 동기화에 사용할 GitHub Gist ID. 첫 업로드 시 자동 생성됩니다.
`soloboisSettingsSync.autoSyncOnStartup` | `true` | 시작 시 자동으로 설정을 다운로드하고 적용합니다.
`soloboisSettingsSync.autoUploadOnChange` | `true` | 설정 변경 시 자동으로 업로드합니다.
`soloboisSettingsSync.autoUploadDelay` | `5000` | 변경 감지 후 자동 업로드 대기 시간(ms).
`soloboisSettingsSync.ignoredSettings` | `["*token*", "*secret*", "*password*", "*apikey*", "*api_key*"]` | 동기화에서 제외할 설정 키 목록(glob 패턴 지원). 시크릿 키 패턴이 기본으로 포함되어 있습니다.
`soloboisSettingsSync.ignoredExtensions` | `[]` | 동기화에서 제외할 익스텐션 ID 목록입니다.
`soloboisSettingsSync.removeExtensions` | `false` | 원격 목록에 없는 로컬 익스텐션을 자동으로 삭제합니다.
`soloboisSettingsSync.authoritativeDownload` | `false` | true이면 원격 설정을 완전한 기준으로 적용합니다. 원격에 없는 로컬 키는 삭제됩니다.
`soloboisSettingsSync.publicGist` | `false` | Gist를 비밀(Secret) 대신 공개(Public)로 생성합니다.
`soloboisSettingsSync.syncSettings` | `true` | `settings.json` 동기화 여부.
`soloboisSettingsSync.syncExtensions` | `true` | 설치된 익스텐션 목록 동기화 여부.
`soloboisSettingsSync.syncKeybindings` | `true` | `keybindings.json` 동기화 여부.
`soloboisSettingsSync.syncSnippets` | `true` | 사용자 스니펫 동기화 여부.
`soloboisSettingsSync.syncAntigravityConfig` | `true` | Antigravity 전용 파일(`antigravity.json`, `browserAllowlist.txt`) 동기화 여부. 미설정 시 실행 환경 기준 기본값이 적용됩니다.
`soloboisSettingsSync.profiles` | `{}` | 프로필별 동기화 정보(gistId, ignoredSettings, ignoredExtensions)를 저장합니다.
`soloboisSettingsSync.currentProfile` | `"Default"` | 현재 활성화된 동기화 프로필 이름입니다.

## 보안

- **기본 비밀 설정**: 모든 동기화용 Gist는 기본적으로 비밀(Secret)로 생성되어 안전합니다.
- **안전한 인증**: VS Code의 내장 인증 기능을 사용하며, 사용자의 비밀번호에 절대 접근하지 않습니다.

---
