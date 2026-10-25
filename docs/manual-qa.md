# Manual QA

Automated tests cover schemas, rendering, package structure, OfficeCLI
validation, animation planning, upload signatures, and security helpers. The
following checks require a real desktop environment and should be completed
before a release.

## Release gate

| Area | Check | Pass condition |
| --- | --- | --- |
| Startup | `docker compose up --build` with secure `.env` | Web healthy, Worker ready |
| Startup guard | Use example secrets | Web refuses to start with a clear message |
| Auth | Wrong password 6 times | 429 after the configured attempts |
| Upload | Rename a text file to `.pdf` | Rejected with 415 |
| Upload | Valid PDF/PPTX/PNG | Accepted and visible in the task |
| Migration | Apply migrations twice | Second run says already applied; no data loss |
| Health | `GET /api/health` | 200 with `database: "ok"` |
| Proof | Generate and open two-slide proof | PowerPoint opens without repair |
| Delivery | Generate and open full PPTX | PowerPoint opens without repair |
| Animations | Animation pane | Expected per-slide entrance effects |
| Transitions | Slide show | Fade/push/wipe transition present |
| Fullscreen | Browser fullscreen | Slide fills viewport; text scales with slide |
| Mobile | 390px viewport | Settings and task cards remain usable |
| Backup | Dump DB + data volume | Restore into a clean compose project |

## PowerPoint compatibility

PowerPoint 16 on Windows is the primary target. For every release:

1. Open the generated proof and full deck with `DisplayAlerts` enabled.
2. If PowerPoint shows a repair prompt, stop the release.
3. Count animations in the animation pane and compare with the task log.
4. Confirm the first animation on the cover is reachable and that item sequences
   advance in the intended order.
5. Save once from PowerPoint and reopen; the file must remain valid.

PowerShell check:

```powershell
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.DisplayAlerts = 1
$pres = $ppt.Presentations.Open(
  'C:\path\to\deck.pptx',
  $true,  # ReadOnly
  $false,
  $false
)
for ($s = 1; $s -le $pres.Slides.Count; $s++) {
  $slide = $pres.Slides.Item($s)
  "slide $s: animations=$($slide.TimeLine.MainSequence.Count) transition=$($slide.SlideShowTransition.EntryEffect)"
}
$pres.Close()
$ppt.Quit()
```

Any `HRESULT E_FAIL` or repair dialog is a failure, not a warning.

## WPS and LibreOffice

These are not currently release gates. Record the version and result in the PR:

- WPS Office: layout, fonts, animation pane, slideshow.
- LibreOffice Impress: open/save, animation preservation.
- Google Slides import (best effort): layout and text overflow.

Do not claim compatibility that was not actually tested.

## Browser matrix

- Chromium / Edge current.
- Firefox current.
- Safari current on macOS or iOS.
- 1440×900, 1920×1080, and 390×844 viewports.

Check:

- fullscreen request fallback when the Fullscreen API is blocked;
- keyboard arrows/PageUp/PageDown/Home/End/Escape;
- click zones and swipe;
- reduced-motion preference;
- no horizontal page overflow.

## Failure injection

- Stop PostgreSQL: `/api/health` returns 503; UI shows a useful error.
- Stop Worker: queue remains pending; restart resumes jobs.
- Remove OfficeCLI: deck is still generated without native motion; task log
  reports degradation.
- Invalid provider key: task fails with a non-secret error; retry works after the
  provider is fixed.
- Kill the web process during a run: task continues in Worker; reopening resumes
  via SSE/task state.

## Security smoke test

```bash
curl -i http://localhost:3000/api/tasks
curl -i http://localhost:3000/api/health
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"wrong"}'
```

Confirm that task endpoints return 401 when auth is enabled, that health does
not expose secrets, and that repeated login failures return 429.

## Clean-room deployment

Use a fresh checkout and an empty data directory:

```bash
git clone <repo> slidecraft-clean
cd slidecraft-clean
cp .env.example .env
# replace secrets
docker compose up --build
```

Create one task end to end, download the PPTX, then remove the compose project:

```bash
docker compose down -v
```

The project is release-ready only if this succeeds without undocumented steps.
