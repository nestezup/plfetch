# plfetch

Local Node.js CLI for fetching Plaud Cloud recordings, transcripts, and summaries.

[한국어 README](./README.ko.md)

## Install

Requirements:

- Node.js 22+
- A logged-in Plaud Cloud browser session for onboarding

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/nestezup/plfetch/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/nestezup/plfetch/main/install.ps1 | iex
```

Install Node.js first if needed:

```bash
# macOS/Linux: install from https://nodejs.org/
```

```powershell
winget install OpenJS.NodeJS.LTS
```

## Installed Locations

macOS/Linux:

```text
App files: ~/.local/share/plfetch
Command:   ~/.local/bin/plfetch
Config:    ~/.config/plfetch/.env
Downloads: ~/Downloads/plfetch
```

Windows:

```text
App files: %LOCALAPPDATA%\Programs\plfetch
Command:   %LOCALAPPDATA%\Microsoft\WindowsApps\plfetch.cmd
Config:    %APPDATA%\plfetch\.env
Downloads: %USERPROFILE%\Downloads\plfetch
```

If `plfetch` is not found after install, open a new terminal. On macOS/Linux, add this if needed:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

For Bash:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Onboarding

`plfetch` needs Plaud Web request headers from your logged-in browser session. It stores them locally in `.env`; it does not write them to your global shell environment.

1. Open `https://web.plaud.ai`.
2. Open DevTools > Network.
3. Click a Plaud file/list request such as `file-task-status`, `/file/simple/web`, or `/file/detail/...`.
4. Right-click the request and choose `Copy` > `Copy as cURL`.
5. Run:

```bash
plfetch onboard
```

Paste the copied cURL, then press `Ctrl-D`.

## Commands

```bash
plfetch list 20
plfetch contents <fileId>
plfetch download <fileId>
plfetch transcript <fileId>
plfetch summary <fileId>
```

Saved files go to the default downloads folder shown above. Use `--output-dir DIR` to change it:

```bash
plfetch download <fileId> --output-dir ~/Desktop/plfetch
```

## Development

Install from a local checkout:

```bash
git clone https://github.com/nestezup/plfetch.git
cd plfetch
./install.sh
```

Run tests:

```bash
npm test
```
