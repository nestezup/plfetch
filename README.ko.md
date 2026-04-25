# plfetch

Plaud Cloud의 녹음 파일, 전사, 요약을 가져오는 로컬 Node.js CLI입니다.

[English README](./README.md)

## 설치

필수 조건:

- Node.js 22+
- 온보딩을 위한 Plaud Cloud 로그인 브라우저 세션

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/nestezup/plfetch/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/nestezup/plfetch/main/install.ps1 | iex
```

Node.js가 없으면 먼저 설치하세요.

```bash
# macOS/Linux: https://nodejs.org/ 에서 설치
```

```powershell
winget install OpenJS.NodeJS.LTS
```

## 설치 위치

macOS/Linux:

```text
앱 파일: ~/.local/share/plfetch
명령어:   ~/.local/bin/plfetch
설정:     ~/.config/plfetch/.env
다운로드: ~/Downloads/plfetch
```

Windows:

```text
앱 파일: %LOCALAPPDATA%\Programs\plfetch
명령어:   %LOCALAPPDATA%\Microsoft\WindowsApps\plfetch.cmd
설정:     %APPDATA%\plfetch\.env
다운로드: %USERPROFILE%\Downloads\plfetch
```

설치 후 `plfetch` 명령을 찾지 못하면 새 터미널을 여세요. macOS/Linux에서 계속 안 되면 아래를 추가하세요.

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Bash를 쓰는 경우:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 온보딩

`plfetch`는 로그인된 브라우저 세션의 Plaud Web 요청 헤더가 필요합니다. 이 정보는 로컬 `.env` 파일에 저장되며, 전역 셸 환경변수에는 쓰지 않습니다.

1. `https://web.plaud.ai`를 엽니다.
2. 개발자 도구 > Network 탭을 엽니다.
3. `file-task-status`, `/file/simple/web`, `/file/detail/...` 같은 Plaud 파일/목록 요청을 클릭합니다.
4. 해당 요청을 오른쪽 클릭하고 `Copy` > `Copy as cURL`을 선택합니다.
5. 아래 명령을 실행합니다.

```bash
plfetch onboard
```

복사한 cURL을 붙여넣고 `Ctrl-D`를 누르세요.

## 명령어

```bash
plfetch list 20
plfetch contents <fileId>
plfetch download <fileId>
plfetch transcript <fileId>
plfetch summary <fileId>
```

저장 파일은 위의 기본 다운로드 폴더에 저장됩니다. 다른 폴더에 저장하려면 `--output-dir DIR`을 사용하세요.

```bash
plfetch download <fileId> --output-dir ~/Desktop/plfetch
```

## 개발

로컬 checkout에서 설치:

```bash
git clone https://github.com/nestezup/plfetch.git
cd plfetch
./install.sh
```

검증 실행:

```bash
npm run check
```
