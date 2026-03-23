# Rozpoczęcie pracy

## Wypróbuj online

Lutris.ai działa w przeglądarce — bez instalacji. Otwórz [app.lutris.ai](https://app.lutris.ai).

## Pobierz aplikację desktopową

Binaria dla macOS, Windows i Linux na [stronie wydań](https://github.com/Lutris.ai/Lutris.ai/releases/latest).

| Platforma | Pobieranie |
|-----------|-----------|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x64) |
| Windows (x64) | `.msi` / `.exe` |
| Windows (ARM) | `.msi` / `.exe` |
| Linux (x64) | `.AppImage` / `.deb` |

## Kompilacja ze źródeł

```sh
git clone https://github.com/Lutris.ai/Lutris.ai.git
cd Lutris.ai
bun install
bun run dev
```

Otwiera edytor na `http://localhost:1420`.

## Dostępne polecenia

| Polecenie | Opis |
|-----------|------|
| `bun run dev` | Serwer deweloperski z HMR |
| `bun run build` | Build produkcyjny |
| `bun run check` | Lint + sprawdzanie typów |
| `bun run test` | Testy E2E (Playwright) |
| `bun run docs:dev` | Serwer dokumentacji |

## Aplikacja desktopowa (Tauri)

Szczegółowe instrukcje dla każdej platformy w [wersji angielskiej](/guide/getting-started).
