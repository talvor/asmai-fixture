# Where a CLI keeps a "recently used" list, and how to write it safely

Research notes for job 3. Notes only: nothing here is a decision.

## How these notes were sourced

The research session could not reach the web: WebFetch was denied and the
sandbox allows no outbound network. Every finding below therefore comes from a
**primary source installed on the research machine** (macOS, Darwin 25.6). Each
citation gives the local path or man page and, where there is one, the
canonical upstream location of the same text. The upstream links were **not**
re-read in this session; they mark where the same source lives online.

| Source | Version read | Local location | Upstream |
| --- | --- | --- | --- |
| macOS `rename(2)` | man page dated June 3, 2021 | `man 2 rename` | — |
| macOS `fsync(2)` | man page dated June 4, 1993 | `man 2 fsync` | — |
| macOS `fcntl(2)` | system man page | `man 2 fcntl`, `F_FULLFSYNC` | — |
| less | 668 | `man less` | https://greenwoodsoftware.com/less |
| GNU bash | 5.3.3 | `/opt/homebrew/share/man/man1/bash.1` | https://www.gnu.org/software/bash/manual/ |
| git docs | 2.50.1 | `/opt/homebrew/share/doc/git-doc/` | https://git-scm.com/docs |
| Go standard library | go1.27.1 | `/opt/homebrew/Cellar/go/1.27.1/libexec/src/` | https://go.dev/src/os/ |
| Python standard library | 3.9.6 | docstrings of `os.replace`, `tempfile.mkstemp` | https://docs.python.org/3/library/os.html#os.replace |
| write-file-atomic (npm) | 6.0.0, bundled in npm 11.5.1 | `/opt/homebrew/lib/node_modules/npm/node_modules/write-file-atomic/lib/index.js` | https://github.com/npm/write-file-atomic |
| env-paths (npm) | 2.2.1, bundled in npm 11.5.1 | `/opt/homebrew/lib/node_modules/npm/node_modules/env-paths/index.js` | https://github.com/sindresorhus/env-paths |

Sources the assignment named that could **not** be read are listed under
[Gaps](#gaps).

---

## Part 1: where the file lives

### 1.1 The two conventions

**Home-directory dotfile.** The older convention is one hidden file directly in
`$HOME`, named after the tool:

- bash: "Bash assigns a default value of `~/.bash_history`" to `HISTFILE`
  (bash(1), *Shell Variables → HISTFILE*).
- less, on Linux and Unix, falls back last to `"$HOME/.lesshst"` (less(1),
  *ENVIRONMENT VARIABLES → LESSHISTFILE*).
- git keeps `~/.gitconfig` as one of the two user-level config files
  (`git-doc/git-config.adoc`, lines 360–364, section *FILES*).

**XDG base directory.** The newer convention puts the file in a per-tool
subdirectory of a directory named by an `XDG_*_HOME` variable, with a default
under `$HOME` when the variable is unusable:

- less's first choices are `"$XDG_STATE_HOME/lesshst"` or
  `"$HOME/.local/state/lesshst"` (less(1), *LESSHISTFILE*). The less man page
  also lists `XDG_STATE_HOME` as a "Possible location of the history file"
  (less(1), *ENVIRONMENT VARIABLES → XDG_STATE_HOME*).
- git reads `$XDG_CONFIG_HOME/git/config`, and "When the XDG_CONFIG_HOME
  environment variable is not set or empty, `$HOME/.config/` is used"
  (`git-config.adoc`, lines 360–364).
- env-paths, the npm library that npm itself bundles, maps a tool's `log`
  path to `env.XDG_STATE_HOME || path.join(homedir, '.local', 'state')`,
  with a comment pointing at the Debian wiki's *state* section
  (`env-paths/index.js`, lines 43–44).

**Which XDG directory a recently-used list belongs in.** less, the one tool
read here that stores exactly this kind of data (a history of searches and
shell commands, its man page says), lists `XDG_STATE_HOME` first and
`XDG_DATA_HOME` second (less(1), *LESSHISTFILE*). The XDG specification's own
wording on what `XDG_STATE_HOME` is for, and its examples, could not be read
in this session: see [Gaps](#gaps).

### 1.2 How tools choose and fall back

The tools read here share one pattern: **an explicit override wins, then the
XDG location, then the legacy dotfile.**

1. **A tool-specific variable overrides everything.** less uses
   `LESSHISTFILE` and bash uses `HISTFILE`. Both treat some values as "off":
   less with `"-"` or `"/dev/null"` ("a history file is not used"), bash
   with unset or null ("the shell does not save the command history when it
   exits") (less(1) *LESSHISTFILE*; bash(1) *HISTFILE*).
2. **Then the XDG location, with the default used when the variable is
   unusable.** On Unix, Go's `os.UserCacheDir` uses `$XDG_CACHE_HOME` "if
   non-empty, else `$HOME/.cache`", and git uses `$HOME/.config` when
   `XDG_CONFIG_HOME` is "not set or empty". So an *empty* variable counts as
   *unset* (`go/src/os/file.go`, lines 495–496 and 528–535;
   `git-config.adoc`, lines 362–364).
3. **Then the legacy dotfile.** less ends its Linux/Unix list with
   `"$HOME/.lesshst"` (less(1), *LESSHISTFILE*).

**Relative paths.** Go refuses a relative value: when `$XDG_CACHE_HOME` is
set to a relative path, `UserCacheDir` returns the error "path in
$XDG_CACHE_HOME is relative" and does not fall back. `UserConfigDir` does the
same for `$XDG_CONFIG_HOME` (`go/src/os/file.go`, lines 502–503, 536–537,
589–590). env-paths 2.2.1 has no such check and uses whatever the variable
holds (`env-paths/index.js`, lines 40–44). Whether the specification says to
*ignore* a relative path or to *reject* it was not read here (see Gaps), so
these notes cannot say which of the two behaviours the specification asks
for.

**Legacy dotfile migration.** The sources read here show two practices, and
neither moves the file:

- *Read both.* git reads the XDG file and `~/.gitconfig`: "If both files
  exist, both files are read in the order given above" (`git-config.adoc`,
  lines 366–367).
- *Fall back to the old name.* less lists the XDG paths and then
  `$HOME/.lesshst` as alternatives (less(1), *LESSHISTFILE*).

Inference, not read in source: the man page gives an order of candidates, not
whether less picks the first *existing* file or the first *usable
directory*. The less source code (`cmd.c`/`decode.c` history-file logic)
would settle that and was not read. No source read here moves a dotfile into
the XDG directory automatically.

**macOS and Windows.** The XDG variables are a Unix convention, and the
libraries read here replace them with platform directories:

| | Linux / Unix | macOS | Windows |
| --- | --- | --- | --- |
| Go `os.UserCacheDir` | `$XDG_CACHE_HOME` or `$HOME/.cache` | `$HOME/Library/Caches` | `%LocalAppData%` |
| Go `os.UserConfigDir` | `$XDG_CONFIG_HOME` or `$HOME/.config` | `$HOME/Library/Application Support` | `%AppData%` |
| env-paths `log` (≈ state) | `$XDG_STATE_HOME` or `~/.local/state` | `~/Library/Logs/<name>` † | `%LOCALAPPDATA%\<name>\Log` † |
| less history | `$XDG_STATE_HOME/lesshst` … `$HOME/.lesshst` | (same as Unix ‡) | `$HOME/_lesshst` |

Sources: `go/src/os/file.go`, lines 490–600; `env-paths/index.js`, lines
10–44; less(1) *LESSHISTFILE*.
† Only the `Library`, `APPDATA` and `LOCALAPPDATA` base paths were read
(lines 10–29); the exact `Logs`/`Log` subpath was not read line by line.
‡ The less man page names no macOS-specific location; that macOS takes the
"Linux and Unix" branch is an inference.

The env-paths source comments that its Windows layout is "invented by me as
Windows isn't opinionated about this" (`env-paths/index.js`, line 26). Go has
**no** `UserStateDir` (only Cache, Config and Home were found in
`go/src/os/file.go`), so a Go tool that wants `XDG_STATE_HOME` must read the
variable itself.

**When `$HOME` itself is missing.** Go returns an error on Unix and macOS
("neither $XDG_CACHE_HOME nor $HOME are defined", "$HOME is not defined"),
and only Android and iOS get hard-coded defaults (`go/src/os/file.go`, lines
514–533 and 605–624). Node's `os.homedir()`, which both env-paths and
asmai-fixture use, was not read (see Gaps).

### 1.3 Dotfile vs XDG state directory: summary

| | `~/.tool-file` | `$XDG_STATE_HOME/tool/file` |
| --- | --- | --- |
| Examples | `~/.bash_history`, `~/.lesshst`, `~/.gitconfig` | `~/.local/state/lesshst`, env-paths `log` |
| Directory to create | none (`$HOME` exists) | `~/.local/state/<tool>` may not exist yet |
| Override variable | tool-specific (`HISTFILE`, `LESSHISTFILE`) | the same, plus `XDG_STATE_HOME` |
| Empty or unset variable | n/a | treated as unset → default (Go, git) |
| Relative variable | n/a | Go errors; env-paths uses it as is |
| macOS / Windows | same dotfile, or `_lesshst` (less on Windows) | libraries map to `Library/…`, `%LOCALAPPDATA%` |
| Existing users | already there | old file must be read or migrated (git reads both; less falls back) |

---

## Part 2: writing the file so a crash cannot leave it half-written

### 2.1 Why writing in place is unsafe

Writing straight to the target file truncates it first and then writes the
new bytes. Go's `lockedfile.Write` shows the shape: `OpenFile(name,
O_WRONLY|O_CREATE|O_TRUNC, perm)` followed by `io.Copy` (`go/src/cmd/go/
internal/lockedfile/lockedfile.go`, lines 116–128). Between the truncation and
the last write the file is empty or partial. Inference, not read in a source:
a crash in that window leaves that partial state behind, which is why the
libraries below write elsewhere and rename instead. Node's
`fs.writeFileSync`, which asmai-fixture uses, opens with flag `'w'` by
default; its documentation was not read (see Gaps).

### 2.2 The pattern: temp file → write → fsync → close → rename → (fsync dir)

write-file-atomic 6.0.0 is a complete, widely used implementation of this
pattern. Its steps, read in `lib/index.js`:

| Step | write-file-atomic | Lines |
| --- | --- | --- |
| Resolve symlinks, so the rename replaces the real file rather than the link | `fs.realpath(filename)` | 91 |
| Temp name **next to the target** (same directory, so same file system) | `filename + '.' + MurmurHash3(__filename, pid, threadId, ++invocations)` | 29–36 |
| Keep the old file's mode and owner | `fs.stat` → `options.mode`, `options.chown` | 94–106 |
| Create and write the temp file | `fs.open(tmpfile, 'w', mode)`, `fs.write` | 109–117 |
| **fsync the temp file** (on unless `fsync: false`) | `fs.fsync(fd)` | 119–121 |
| Close, then chown/chmod the temp file | `fs.close`, `fs.chown`, `fs.chmod` | 123–140 |
| **Atomically replace** the target | `fs.rename(tmpfile, truename)` | 142 |
| Always try to remove the temp file (a no-op after a successful rename) | `fs.unlink(tmpfile).catch(() => {})` in `finally` | 151 |

What each step relies on:

**Same directory.** A rename must stay on one file system: on macOS
`rename()` fails with `EXDEV` when "The link named by *new* and the file named
by *old* are on different logical devices (file systems)" (`rename(2)`,
*ERRORS*). Go's `os.Rename` adds: "OS-specific restrictions may apply when
oldpath and newpath are in different directories" (`go/src/os/file.go`,
line 433). A temp file from the system temp directory (`os.TempDir()`, which
Go's `CreateTemp` uses when `dir == ""`, `go/src/os/tempfile.go`, lines
35–38) can sit on another file system, so the temp file is created in the
target's directory.

**Atomic rename.** macOS `rename(2)`: "If *new* exists, it is first removed",
and "The rename() system call guarantees that an instance of *new* will always
exist, even if the system should crash in the middle of the operation"
(`rename(2)`, *DESCRIPTION*). A reader therefore sees either the old file or
the new one, never a partial one. **Limits:**

- Go: "Even within the same directory, on non-Unix platforms Rename is not an
  atomic operation" (`go/src/os/file.go`, line 434). On Windows the guarantee
  above does not hold for Go programs, and these notes have no source on what
  Node does there.
- Python's `os.replace` docstring says only "Rename a file or directory,
  overwriting the destination" (Python 3.9.6). The atomicity sentence in the
  online documentation was not read (see Gaps).
- The POSIX text for `rename()` was not read (see Gaps). The guarantee quoted
  above is Apple's.

**fsync of the file before the rename.** `fsync()` "causes all modified data
and attributes of *fildes* to be moved to a permanent storage device"
(`fsync(2)`, *DESCRIPTION*). Inference: without it, the rename can reach the
disk before the file's data does, so after a power loss the new name could
point at an empty or partial file. That ordering argument is the reason
write-file-atomic fsyncs by default; it was not found stated in a source read
here. **Limits on macOS:** the same man page warns that fsync flushes only "from
the host to the drive", that "the drive itself may not physically write the
data to the platters for quite some time and it may be written in an
out-of-order sequence", and that "This is not a theoretical edge case". For
stronger guarantees it points to `F_FULLFSYNC` (`fsync(2)`). `fcntl(2)` says
`F_FULLFSYNC` "Does the same thing as fsync(2) then asks the drive to flush
all buffered data to the permanent storage device", implemented on HFS, FAT,
UDF and APFS (`fcntl(2)`, *F_FULLFSYNC*). git documents the same trade-off:
its `core.fsyncMethod=writeout-only` "may not be durable in the event of a
system crash. This is the default mode on macOS" (`git-config.html`,
*core.fsyncMethod*). Whether Node's `fs.fsync` uses `F_FULLFSYNC` on macOS
was not read (see Gaps).

**fsync of the directory after the rename.** The rename changes a *directory
entry*. Inference: the rename is durable only when the directory itself is
flushed, which is done by opening the directory and fsyncing that descriptor.
**No source read in this session states this requirement**, and
write-file-atomic 6.0.0 does **not** do it: no `fsync` on the directory
appears anywhere in `lib/index.js` (every `fsync` match is the temp file's
`fd`, lines 119–121 and 225–227). The consequence, inferred: after a power
loss a write-file-atomic write can be rolled back to the *old* file, but never
to a half-written one. This is a gap to close against the Linux `fsync(2)` man
page, the POSIX `fsync()` rationale, or a library that does it (for example
Go's `cmd/go/internal/robustio` or the `renameio` packages, not read).

### 2.3 Permissions

- **Secure temp-file creation.** Go's `os.CreateTemp` opens with
  `O_RDWR|O_CREATE|O_EXCL` and mode `0600`, retrying with new random names
  (`go/src/os/tempfile.go`, lines 46–49). Python's `tempfile.mkstemp`: "The
  file is readable and writable only by the creating user ID … The file
  descriptor is not inherited by children of this process" (`mkstemp`
  docstring, Python 3.9.6). `O_EXCL` means a write never follows a symlink
  someone else planted at the temp name.
- **Preserving the target's mode.** Because the rename replaces the target
  with a *new* inode, the new file has the temp file's mode, not the old
  file's. write-file-atomic copies `stats.mode` and `uid`/`gid` from the
  existing target unless told otherwise (`lib/index.js`, lines 94–106,
  126–140). Its temp file is opened with plain `'w'` (no `O_EXCL`, line 109).
  It relies on the hashed name being unique, not on exclusive creation.
- **Directory mode.** Inference: a recently-used list can reveal what a user
  worked on, which argues for `0700` on a newly created state directory. The
  XDG specification's wording on directory permissions was not read (see
  Gaps).

### 2.4 Cleaning up stale temp files

- On a normal error, write-file-atomic unlinks the temp file in `finally`
  (`lib/index.js`, line 151).
- On a signal or `process.exit`, it registers a `signal-exit` handler that
  unlinks the temp file (`lib/index.js`, lines 9, 38–46, 86), and removes the
  handler when done (line 150).
- **Limit:** neither runs on `SIGKILL`, a kernel panic or a power loss
  (inference: no process code runs then). A temp file named
  `<target>.<hash>` can then be left behind. No library read here sweeps old
  temp files on the next start. The sources read show no standard practice
  for this, so it is a gap. Inference: a predictable prefix such as
  `<target>.` makes such a sweep possible.

### 2.5 Concurrent writers

Atomic rename keeps the file *whole*, but two processes doing
read-modify-write can still **lose an update**: each reads the old list,
appends its own entry, and the last rename wins (inference; it follows from
the steps above).

- **write-file-atomic serializes only within one process.** Its queue is a
  module-level `activeFiles[absoluteName]` map (`lib/index.js`, lines 48–60,
  152–157). Two separate CLI invocations do not share it.
- **Advisory lock on the file.** Go's `lockedfile` package "creates and
  manipulates files whose contents should only change atomically". Opening
  for write takes a write lock, and "If the program exits while a file is
  locked, the operating system releases the lock but may not do so promptly"
  (`go/src/cmd/go/internal/lockedfile/lockedfile.go`, lines 5–7, 17–23,
  37–40). `Transform` locks, reads, transforms and writes back (lines
  130–150).
- **Lock file + rename (git's pattern).** git's reftable backend: "Acquire
  `tables.list.lock`", write the new content to `tables.list.lock`, then
  "Rename `tables.list.lock` to `tables.list`". "Because a single
  `tables.list.lock` file is used to manage locking, the repository is
  single-threaded for writers. Writers may have to busy-spin (with backoff)
  around creating `tables.list.lock`" (`git-doc/technical/reftable.adoc`,
  lines 929–951). The `.lock` file is both the mutex and the temp file. git's
  general `lockfile.h` API, which uses the same `<file>.lock` scheme for most
  of its files, was not read (see Gaps).
- **Append instead of rewrite.** bash's `histappend` option makes bash append
  "the entries to the history file, otherwise it overwrites the history
  file" (bash(1), *HISTORY*). Appending avoids the lost-update race for
  *adding* entries, but bash then truncates the file to `HISTFILESIZE` lines
  "After saving the history" (same section), which rewrites it. bash's
  `HISTFILESIZE` text also says that with multi-line entries the file "may
  contain more lines than this maximum to avoid leaving partial history
  entries" (bash(1), *HISTFILESIZE*). Whether bash's own rewrite uses
  temp+rename was not read (see Gaps).

---

## Part 3: asmai-fixture's current store (context only)

What the code does today, read in `src/store.js` at `a6fd3e9`. Nothing here
is a recommendation.

- **Location:** `process.env.ASMAI_FIXTURE_STORE || join(homedir(),
  '.asmai-fixture.json')` (line 6). This is the home-directory dotfile
  convention, with a tool-specific override variable in the style of
  `HISTFILE` and `LESSHISTFILE`. An empty `ASMAI_FIXTURE_STORE` falls through
  to the default, because `||` treats `''` as false. That matches how Go
  and git treat an empty `XDG_*` variable (§1.2). A relative
  `ASMAI_FIXTURE_STORE` is used as given, relative to the working directory,
  like env-paths and unlike Go's XDG helpers (§1.2). The store does not
  consult `XDG_STATE_HOME`, and has no "off" value like less's `-`.
- **Write path:** `rememberGreeting` reads the whole list, pushes one entry
  and calls `writeFileSync(path, JSON.stringify(entries, null, 2) + '\n')`
  (lines 44–52). That is the in-place truncate-and-write of §2.1, with no
  temp file, no fsync and no rename.
- **Read path already handles damage:** a file that exists but is not valid
  JSON, or not a list of greetings, raises `DamagedStoreError` (lines
  30–42). Per the last commits, the CLI then keeps greeting rather than
  failing (`git log`: "Keep greeting when the store is corrupt or
  unreadable"). A half-written file from §2.1 would land in this path.
- **Concurrency:** read-modify-write with no lock, so the lost-update race
  of §2.5 applies to two `asmai-fixture` processes greeting at the same time.
- **Mode:** `writeFileSync` creates the file with Node's default mode, less
  the umask. The default value was not read (see Gaps).

The options these findings bear on are where the file lives (§1) and how
it is written (§2). Choosing among them is a decision for the user and is
not made here.

---

## Gaps

Claims these notes could **not** tie to a source read in this session:

1. **XDG Base Directory Specification** (https://specifications.freedesktop.org/basedir-spec/latest/):
   not readable (no network). Not settled from the specification itself:
   the definition and intended contents of `XDG_STATE_HOME`, its
   `$HOME/.local/state` default, the "unset or empty" rule, the rule for
   relative paths, and the directory-permission rule. The default and the
   empty-means-unset behaviour above come from implementers (less, git, Go,
   env-paths), not from the spec.
2. **POSIX `rename()` and `fsync()`** (https://pubs.opengroup.org/onlinepubs/9799919799/):
   not readable. The rename and fsync guarantees above are quoted from the
   **macOS** man pages only. Linux `rename(2)`/`fsync(2)` (man7.org),
   including what Linux says about fsyncing the directory, were not read.
3. **Directory fsync:** no source read states that the containing directory
   must be fsynced for the rename to be durable. §2.2 marks this as an
   inference.
4. **Node.js `fs` documentation** (https://nodejs.org/api/fs.html): not
   installed locally and not readable. Not verified: `fs.rename` atomicity
   and Windows behaviour, whether `fs.fsync` uses `F_FULLFSYNC` on macOS,
   `fs.writeFileSync`'s default flag and mode, and `os.homedir()` fallback
   behaviour.
5. **Python `os.replace` atomicity:** the local 3.9.6 docstring does not
   state it. The online documentation was not read.
6. **git `lockfile.h` / `tempfile.c` source:** not installed. Only the
   reftable design doc's lock+rename procedure was read.
7. **less source code:** not read, so whether less picks the first existing
   history file or the first usable location, and whether it writes the
   history file via temp+rename, is unknown.
8. **bash history-file write mechanics** (temp+rename or in place): not
   read in source.
9. **Stale temp-file sweeping:** no library read implements it. There is no
   sourced common practice.
10. **Go `renameio` / `cmd/go/internal/robustio`:** not read, so no Go
    example of directory fsync is cited.
11. **env-paths macOS and Windows `log` subpaths** were not read line by
    line (§1.2 table, †).
