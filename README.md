# Soloboi's Settings Sync 🚀

Version | Installs | Rating | OpenVSX | Downloads
--- | --- | --- | --- | ---
[![Version](https://img.shields.io/visual-studio-marketplace/v/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Installs](https://img.shields.io/visual-studio-marketplace/i/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Rating](https://img.shields.io/visual-studio-marketplace/r/soloboi.solobois-settings-sync.svg)](https://marketplace.visualstudio.com/items?itemName=soloboi.solobois-settings-sync) | [![Open VSX](https://img.shields.io/open-vsx/v/soloboi/solobois-settings-sync.svg)](https://open-vsx.org/extension/soloboi/solobois-settings-sync) | [![Downloads](https://img.shields.io/open-vsx/dt/soloboi/solobois-settings-sync.svg)](https://open-vsx.org/extension/soloboi/solobois-settings-sync)

Soloboi's Settings Sync turbo-charges your workflow by seamlessly synchronizing your VS Code (and Antigravity) settings, keybindings, extensions, and snippets across multiple devices using GitHub Gist.

## Features

- **One-Click Synchronization**: Sync everything with a single command or button.
- **GitHub Gist Integration**: Securely store and version your configurations.
- **Auto-Backup**: Automatically creates local backups before applying remote changes.
- **Selective Sync**: Fine-grained control over which settings to ignore across different machines.
- **Extension Management**: Keep your extension list in sync, with optional auto-cleanup of local-only extensions.
- **Gist History**: Browse and rollback to previous configuration versions.

## Commands

Command | Description
--- | ---
`soloboisSettingsSync.login` | Login to GitHub to enable synchronization.
`soloboisSettingsSync.logout` | Logout from GitHub.
`soloboisSettingsSync.syncNow` | Perform a full sync (Upload & Download).
`soloboisSettingsSync.uploadNow` | Manually upload current local settings to Gist.
`soloboisSettingsSync.downloadNow` | Manually download and apply settings from Gist.
`soloboisSettingsSync.showHistory` | Open the history of your settings Gist.

## Settings

Setting | Default | Description
--- | --- | ---
`soloboisSettingsSync.gistId` | `""` | GitHub Gist ID for synchronization. Auto-created on first upload.
`soloboisSettingsSync.autoSyncOnStartup` | `true` | Automatically download and apply settings on startup.
`soloboisSettingsSync.autoUploadOnChange` | `true` | Automatically upload settings when local configuration changes.
`soloboisSettingsSync.autoUploadDelay` | `5000` | Delay (ms) before auto-uploading after a change.
`soloboisSettingsSync.ignoredSettings` | `[]` | List of setting keys (glob patterns) to exclude from sync.
`soloboisSettingsSync.removeExtensions` | `false` | Automatically uninstall extensions not present in the remote list.
`soloboisSettingsSync.publicGist` | `false` | Use Public Gist instead of Secret (Private) for storage.

## Security

- **Private by Default**: All sync Gists are created as Secret (Private) to ensure your settings are not public.
- **Secure Authentication**: Uses VS Code's built-in Authentication Provider; we never touch your password.

---

### Happy Coding! 😊

