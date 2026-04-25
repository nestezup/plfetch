# plfetch

Local Bun CLI for fetching Plaud Cloud recordings, transcripts, and summaries.

## Requirements

- Bun 1.2+
- A logged-in Plaud Cloud browser session for onboarding

No third-party packages are required.

## Setup

Install locally from this checkout:

```bash
./install.sh
```

The installer places files in common CLI locations:

```text
App files: ~/.local/share/plfetch
Command:   ~/.local/bin/plfetch
Config:    ~/.config/plfetch/.env
Downloads: ~/Downloads/plfetch
```

If `plfetch` is not found after install, add `~/.local/bin` to your shell path:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

For Bash shells:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Windows

The current installer targets macOS/Linux-style shells. Windows users should use one of these options:

- **Recommended:** install and run from WSL.
- **Also works for simple use:** Git Bash, if Bun is installed and available there.

WSL install:

```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://raw.githubusercontent.com/nestezup/plfetch/main/install.sh \
  | PLFETCH_REPO_URL=https://github.com/nestezup/plfetch.git bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
plfetch onboard
```

Native PowerShell support is not packaged yet. The future native Windows layout should be:

```text
App files: %LOCALAPPDATA%\Programs\plfetch
Command:   plfetch.cmd
Config:    %APPDATA%\plfetch\.env
Downloads: %USERPROFILE%\Downloads\plfetch
```

## Onboarding

From Plaud Cloud, copy a request as cURL:

1. Open `https://web.plaud.ai`.
2. Open DevTools > Network.
3. Click a Plaud file/list request such as `file-task-status`, `/file/simple/web`, or `/file/detail/...`.
4. Right-click the request and choose `Copy` > `Copy as cURL`.
5. Run:

```bash
plfetch onboard
```

Paste the copied cURL, then press `Ctrl-D`. This writes `~/.config/plfetch/.env` and backs up an existing `.env`.

## Commands

```bash
plfetch list 20
plfetch contents <fileId>
plfetch download <fileId>
plfetch transcript <fileId>
plfetch summary <fileId>
```

Saved files go to `~/Downloads/plfetch` by default. Use `--output-dir DIR` to change it.

## GitHub Install Pattern

After pushing this project to GitHub, users can install with one command.

Using a full repo clone:

```bash
curl -fsSL https://raw.githubusercontent.com/nestezup/plfetch/main/install.sh \
  | PLFETCH_REPO_URL=https://github.com/nestezup/plfetch.git bash
```

Using only raw files:

```bash
curl -fsSL https://raw.githubusercontent.com/nestezup/plfetch/main/install.sh \
  | PLFETCH_RAW_BASE_URL=https://raw.githubusercontent.com/nestezup/plfetch/main bash
```

The clone method is usually better because it preserves the full project and is easier to update later.
