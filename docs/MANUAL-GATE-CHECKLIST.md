# Gate D manual acceptance checklist

Status: PENDING. This checklist is deliberately outside the locked acceptance/spec documents. It is evidence collection, not an automated-pass substitute.

## Preconditions

Run on a new local OS user profile with a fresh Obsidian profile. Record the exact Obsidian version, plugin commit, OS version and UTC start time in the evidence file.

```sh
pnpm install --frozen-lockfile
pnpm run ci
pnpm acceptance
```

Save terminal output as `manual-evidence/<os>-<utc>/automation.log`.

## macOS and Windows workflow

Repeat every item independently on macOS and Windows. Mark PASS only with a screenshot or screen recording filename and the observed result. Any failure remains PENDING/FAIL and blocks release.

| ID | Reproducible action | Expected evidence |
| --- | --- | --- |
| D-OS-01 | Install the built plugin into a new Obsidian profile, open the dashboard, create and unlock a Client, create a Job from the supplied demo vault. | Store path is in OS Application Data, not the vault; no console error. |
| D-OS-02 | Lock Client, switch Client, put the machine to sleep and resume after 15 minutes, then try review/export. | Keys are cleared and sensitive view is masked until unlock. |
| D-OS-03 | Complete scan, review, Shadow, Safe Package, Result import, restore and `.pbjob` backup/import. | Each state transition appears once; original vault checksum before/after is equal. |
| D-OS-04 | Upgrade plugin, then rollback plugin version with an existing store. | Store remains readable or shows a safe migration error. No new empty Client/Job is created. |
| D-OS-05 | Uninstall/reinstall plugin after creating a Client and Job. | Secure Store behavior matches the documented local-data policy; source remains unchanged. |

## Keyboard and screen-reader gate

Use VoiceOver on macOS and Narrator on Windows. With keyboard only, tab through dashboard, review and disabled Export controls.

| ID | Reproducible action | Expected evidence |
| --- | --- | --- |
| D-A11Y-01 | Navigate every command/view/button by keyboard without a mouse. | Visible focus order, no keyboard trap, Escape closes modal. |
| D-A11Y-02 | Read locked state and disabled Export control with screen reader. | State, action and every blocking reason are announced. |
| D-A11Y-03 | Lock Client while review/diff is visible. | Raw text is removed/masked and focus lands on a safe control. |

## Performance gate

Generate the locked performance fixture and record elapsed time and peak memory on each OS.

```sh
pnpm performance:fixture
```

Run the UI scan against the generated 50 MB/1,000-note fixture. Attach the command output plus OS activity-monitor screenshot. This remains PENDING until a human records the agreed threshold decision.
