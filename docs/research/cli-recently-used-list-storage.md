# Where a CLI keeps a "recently used" list, and how to write it safely

Research notes for job 3. Notes only: nothing here is a decision.

## How these notes were sourced

The sources came in two passes:

- **First pass, with no network.** Sources installed on the research machine
  (macOS, Darwin 25.6), read locally.
- **Second pass, on the user's decision 5 (job 3).** That decision gave network
  access to the XDG specification, POSIX, the man7.org Linux man pages and the
  Node.js docs, and those pages were read online on 2026-10-29.

Each citation gives the page, man page section or source file and line, and
the version read.

| Source | Version read | Where read |
| --- | --- | --- |
| XDG Base Directory Specification | 0.8, 8 May 2021 | https://specifications.freedesktop.org/basedir/latest/ (the `basedir-spec/latest/` URL redirects here) |
| POSIX `rename()` | IEEE Std 1003.1-2024 (Issue 8) | https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html |
| POSIX `fsync()` | IEEE Std 1003.1-2024 (Issue 8) | https://pubs.opengroup.org/onlinepubs/9799919799/functions/fsync.html |
| Linux `rename(2)` | man-pages 6.19, 2026-02-08 | https://man7.org/linux/man-pages/man2/rename.2.html |
| Linux `fsync(2)` | man-pages 6.19, 2026-02-08 | https://man7.org/linux/man-pages/man2/fsync.2.html |
| Node.js `fs` | v26.13.0 | https://nodejs.org/api/fs.html (source text `https://nodejs.org/api/fs.md`) |
| Node.js `os` | v26.13.0 | https://nodejs.org/api/os.html#oshomedir |
| macOS `rename(2)` | man page dated June 3, 2021 | `man 2 rename`, read locally |
| macOS `fsync(2)` | man page dated June 4, 1993 | `man 2 fsync`, read locally |
| macOS `fcntl(2)` | system man page | `man 2 fcntl`, `F_FULLFSYNC`, read locally |
| less | 668 | `man less`, read locally |
| GNU bash | 5.3.3 | `/opt/homebrew/share/man/man1/bash.1` (upstream https://www.gnu.org/software/bash/manual/) |
| git docs | 2.50.1 | `/opt/homebrew/share/doc/git-doc/` (upstream https://git-scm.com/docs) |
| Go standard library | go1.27.1 | `/opt/homebrew/Cellar/go/1.27.1/libexec/src/` (upstream https://go.dev/src/os/) |
| Python standard library | 3.9.6 | docstrings of `os.replace`, `tempfile.mkstemp` |
| write-file-atomic (npm) | 6.0.0, bundled in npm 11.5.1 | `/opt/homebrew/lib/node_modules/npm/node_modules/write-file-atomic/lib/index.js` (upstream https://github.com/npm/write-file-atomic) |
| env-paths (npm) | 2.2.1, bundled in npm 11.5.1 | `/opt/homebrew/lib/node_modules/npm/node_modules/env-paths/index.js` (upstream https://github.com/sindresorhus/env-paths) |

The rows read locally were not re-read upstream. What is still unsourced is
listed under [Gaps](#gaps).

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

**Which XDG directory a recently-used list belongs in.** The specification
answers this directly. Its *Environment variables* section says:

> `$XDG_STATE_HOME` defines the base directory relative to which user-specific
> state files should be stored. If `$XDG_STATE_HOME` is either not set or
> empty, a default equal to `$HOME/.local/state` should be used.

It goes on to say what the directory is for:

> The `$XDG_STATE_HOME` contains state data that should persist between
> (application) restarts, but that is not important or portable enough to the
> user that it should be stored in `$XDG_DATA_HOME`. It may contain:
> actions history (logs, history, recently used files, …); current state of
> the application that can be reused on a restart (view, layout, open files,
> undo history, …)

(XDG Base Directory Specification 0.8, section 3). "Recently used files" is
one of the spec's own examples. less follows this ordering: it lists
`XDG_STATE_HOME` first and `XDG_DATA_HOME` second (less(1), *LESSHISTFILE*).

### 1.2 How tools choose and fall back

The tools read here share one pattern: **an explicit override wins, then the
XDG location, then the legacy dotfile.**

1. **A tool-specific variable overrides everything.** less uses
   `LESSHISTFILE` and bash uses `HISTFILE`. Both treat some values as "off":
   less with `"-"` or `"/dev/null"` ("a history file is not used"), bash
   with unset or null ("the shell does not save the command history when it
   exits") (less(1) *LESSHISTFILE*; bash(1) *HISTFILE*).
2. **Then the XDG location, with the default used when the variable is not
   set or is empty.** The spec makes empty mean unset: "If `$XDG_STATE_HOME`
   is either not set or empty, a default equal to `$HOME/.local/state`
   should be used". The same wording appears for `XDG_DATA_HOME` and the
   other `*_HOME` variables (XDG spec 0.8, section 3). The implementers
   read here do the same:
   - Go's `os.UserCacheDir` uses `$XDG_CACHE_HOME` "if non-empty, else
     `$HOME/.cache`" (`go/src/os/file.go`, lines 495–496 and 528–535).
   - git falls back when `XDG_CONFIG_HOME` is "not set or empty"
     (`git-config.adoc`, lines 362–364).
   - env-paths's `||` treats `''` as unset (`env-paths/index.js`, line 44).
3. **Then the legacy dotfile.** less ends its Linux/Unix list with
   `"$HOME/.lesshst"` (less(1), *LESSHISTFILE*).

**Relative paths.** The spec says: "All paths set in these environment
variables must be absolute. If an implementation encounters a relative path
in any of these variables it should consider the path invalid and ignore it"
(XDG spec 0.8, section 3). Implementers handle this in three ways:

| Implementer | What it does with a relative value | Source |
| --- | --- | --- |
| The spec | Treat the path as invalid and ignore it. Read with the empty-or-unset rule, this means the default applies (inference). | XDG spec 0.8, section 3 |
| Go `UserCacheDir`, `UserConfigDir` | Return the error "path in $XDG_CACHE_HOME is relative" (and the same for `$XDG_CONFIG_HOME`) instead of falling back | `go/src/os/file.go`, lines 502–503, 536–537, 589–590 |
| env-paths 2.2.1 | Use the value as it is, with no check | `env-paths/index.js`, lines 40–44 |

So Go rejects a relative value where the spec asks for it to be ignored, and
env-paths does not follow the rule at all.

**Legacy dotfile migration.** The sources read here show two practices, and
neither moves the file:

- *Read both.* git reads the XDG file and `~/.gitconfig`: "If both files
  exist, both files are read in the order given above" (`git-config.adoc`,
  lines 366–367).
- *Fall back to the old name.* less lists the XDG paths and then
  `$HOME/.lesshst` as alternatives (less(1), *LESSHISTFILE*).

The man page gives an order of candidates. It does not say whether less picks
the first *existing* file or the first *usable directory*, and the less
source code, which would settle that, was not read. No source read here moves
a dotfile into the XDG directory automatically, and the XDG spec says nothing
about migration.

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

- † Only the `Library`, `APPDATA` and `LOCALAPPDATA` base paths were read
  (lines 10–29). The exact `Logs`/`Log` subpath was not read line by line.
- ‡ The less man page names no macOS-specific location. That macOS takes the
  "Linux and Unix" branch is an inference.

The env-paths source comments that its Windows layout is "invented by me as
Windows isn't opinionated about this" (`env-paths/index.js`, line 26). Go has
**no** `UserStateDir` (only Cache, Config and Home were found in
`go/src/os/file.go`), so a Go tool that wants `XDG_STATE_HOME` must read the
variable itself. The XDG spec itself names no macOS or Windows locations.

**When `$HOME` itself is missing.**

- **Go** returns an error on Unix and macOS ("neither $XDG_CACHE_HOME nor
  $HOME are defined", "$HOME is not defined"). Only Android and iOS get
  hard-coded defaults (`go/src/os/file.go`, lines 514–533 and 605–624).
- **Node's `os.homedir()`**, which env-paths and asmai-fixture both use, falls
  back instead. The docs say: "On POSIX, it uses the `$HOME` environment
  variable if defined. Otherwise it uses the effective UID to look up the
  user's home directory. On Windows, it uses the `USERPROFILE` environment
  variable if defined. Otherwise it uses the path to the profile directory of
  the current user" (Node.js v26.13.0, `os.homedir()`).

### 1.3 Dotfile vs XDG state directory: summary

| | `~/.tool-file` | `$XDG_STATE_HOME/tool/file` |
| --- | --- | --- |
| Examples | `~/.bash_history`, `~/.lesshst`, `~/.gitconfig` | `~/.local/state/lesshst`, env-paths `log` |
| What the spec says it is for | n/a | state, including "recently used files" (XDG §3) |
| Directory to create | none (`$HOME` exists) | `~/.local/state/<tool>` may not exist yet. The spec says to create it with mode `0700` (§2.3) |
| Override variable | tool-specific (`HISTFILE`, `LESSHISTFILE`) | the same, plus `XDG_STATE_HOME` |
| Empty or unset variable | n/a | the default is used (spec; Go, git, env-paths) |
| Relative variable | n/a | the spec says ignore it. Go errors, env-paths uses it as is |
| macOS / Windows | same dotfile, or `_lesshst` (less on Windows) | the spec is silent. Libraries map to `Library/…`, `%LOCALAPPDATA%` |
| Existing users | already there | the old file must be read or migrated (git reads both; less falls back) |

---

## Part 2: writing the file so a crash cannot leave it half-written

### 2.1 Why writing in place is unsafe

Writing straight to the target file truncates it first and then writes the
new bytes:

- **Node.** `fs.writeFileSync`'s `flag` option defaults to `'w'`, and `'w'`
  means "Open file for writing. The file is created (if it does not exist) or
  truncated (if it exists)" (Node.js v26.13.0, `fs.writeFileSync` options and
  *File system flags*). The docs also call `fs.writeFile` "a convenience
  method that performs multiple `write` calls internally" (`fs.writeFile`).
  So the file is truncated before the data is written, and the data may go
  out in more than one write.
- **Go.** `lockedfile.Write` has the same shape: `OpenFile(name,
  O_WRONLY|O_CREATE|O_TRUNC, perm)` followed by `io.Copy`
  (`go/src/cmd/go/internal/lockedfile/lockedfile.go`, lines 116–128).

Between the truncation and the last write the file is empty or partial.
A crash in that window leaves that partial state on disk. That consequence is
inferred: no source read says it in one sentence. It is the reason the
libraries below write to a different file and rename it into place.

### 2.2 The pattern: temp file → write → fsync → close → rename → fsync dir

write-file-atomic 6.0.0 is a complete, widely used implementation of the
first five steps. Its steps, read in `lib/index.js`:

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

**Same directory.** A rename must stay on one file system:

- **POSIX** `rename()` fails with `EXDEV` when "The file named by *old* and
  the directory in which the directory entry named by *new* is to be created
  or replaced are on different file systems and the implementation does not
  support hard links between file systems" (POSIX.1-2024, `rename()`,
  *ERRORS*).
- **Linux** adds that "rename() does not work across different mount points,
  even if the same filesystem is mounted on both" (`rename(2)`, *ERRORS*,
  `EXDEV`). macOS `rename(2)` gives the same `EXDEV` error.
- **Go** `os.Rename`: "OS-specific restrictions may apply when oldpath and
  newpath are in different directories" (`go/src/os/file.go`, line 433).

A temp file in the system temp directory (`os.TempDir()`, which Go's
`CreateTemp` uses when `dir == ""`, `go/src/os/tempfile.go`, lines 35–38) can
sit on another file system. That is why the temp file goes in the target's
directory.

**Atomic rename.** The three Unix sources give the guarantee in their own
words:

- **POSIX:** "If the directory entry named by *new* exists, it shall be
  removed and *old* renamed to *new*. … a directory entry named *new* shall
  remain visible to other threads throughout the renaming operation and refer
  either to the file referred to by *new* or *old* before the operation
  began." The *RATIONALE* adds that the specification "requires that the
  action of the function be atomic" (POSIX.1-2024, `rename()`).
- **Linux:** "If newpath already exists, it will be atomically replaced, so
  that there is no point at which another process attempting to access
  newpath will find it missing. However, there will probably be a window in
  which both oldpath and newpath refer to the file being renamed"
  (`rename(2)`, *DESCRIPTION*).
- **macOS:** "The rename() system call guarantees that an instance of *new*
  will always exist, even if the system should crash in the middle of the
  operation" (`rename(2)`, *DESCRIPTION*).

A reader therefore sees either the old file or the new one, never a partial
one. **Limits:**

- **Crashes.** POSIX and Linux state the guarantee for *other processes or
  threads that are running*. They say nothing about what is on disk after a
  crash. Only Apple's page speaks of a crash. Durability across a crash comes
  from the fsyncs below.
- **NFS.** Linux warns: "On NFS filesystems, you can not assume that if the
  operation failed, the file was not renamed" (`rename(2)`, *BUGS*).
- **Windows.**
  - Go: "Even within the same directory, on non-Unix platforms Rename is not
    an atomic operation" (`go/src/os/file.go`, line 434).
  - Node's `fs.rename` says only that "In the case that `newPath` already
    exists, it will be overwritten. If there is a directory at `newPath`, an
    error will be raised instead", and refers to rename(2).
    `fs.renameSync` says "See the POSIX rename(2) documentation for more
    details" (Node.js v26.13.0).
  - The Node docs say nothing about whether the replacement is atomic on
    Windows.
- **Python.** The `os.replace` docstring says only "Rename a file or
  directory, overwriting the destination" (Python 3.9.6). The atomicity
  sentence in the online documentation was not read (see Gaps).

**fsync of the file before the rename.** What fsync promises:

- **POSIX:** `fsync()` "shall request that all data for the open file
  descriptor named by *fildes* is to be transferred to the storage device
  …. The nature of the transfer is implementation-defined." Only when
  `_POSIX_SYNCHRONIZED_IO` is defined does it "force all currently queued
  I/O operations … to the synchronized I/O completion state". The
  *RATIONALE* adds that without that option "a null implementation is
  permitted" (POSIX.1-2024, `fsync()`).
- **Linux:** `fsync()` "transfers ("flushes") all modified in-core data of
  (i.e., modified buffer cache pages for) the file referred to by the file
  descriptor fd to the disk device (or other permanent storage device) so
  that all changed information can be retrieved even if the system crashes
  or is rebooted", and it also flushes the file's metadata (`fsync(2)`,
  *DESCRIPTION*).
- **macOS:** `fsync()` "causes all modified data and attributes of *fildes*
  to be moved to a permanent storage device" (`fsync(2)`, *DESCRIPTION*).
- **Node:** `fs.fsync` and `fs.fsyncSync` "Request that all data for the
  open file descriptor is flushed to the storage device. The specific
  implementation is operating system and device specific. Refer to the POSIX
  fsync(2) documentation for more detail" (Node.js v26.13.0).
  `fs.writeFileSync` has a `flush` option (since v21.0.0 and v20.10.0): "If
  all data is successfully written to the file, and `flush` is `true`,
  `fs.fsyncSync()` is used to flush the data". It flushes the file being
  written, which with flag `'w'` is still the target written in place
  (§2.1).

Why the ordering matters is inferred: without an fsync before the rename,
the rename can reach the disk before the file's data does, so after a power
loss the new name could point at an empty or partial file. None of the
sources above spells out that ordering argument. It is the reason
write-file-atomic fsyncs by default.

**Limits on the drive cache:**

- **macOS.** The macOS `fsync(2)` page warns that fsync flushes only "from
  the host to the drive", that "the drive itself may not physically write the
  data to the platters for quite some time and it may be written in an
  out-of-order sequence", and that "This is not a theoretical edge case". For
  stronger guarantees it points to `F_FULLFSYNC`. `fcntl(2)` says
  `F_FULLFSYNC` "Does the same thing as fsync(2) then asks the drive to flush
  all buffered data to the permanent storage device", implemented on HFS,
  FAT, UDF and APFS (`fcntl(2)`, *F_FULLFSYNC*).
- **git** documents the same trade-off: its `core.fsyncMethod=writeout-only`
  "may not be durable in the event of a system crash. This is the default
  mode on macOS" (`git-config.html`, *core.fsyncMethod*).
- **Linux.** The Linux `fsync(2)` page says: "The fsync() implementations in
  older kernels and lesser used filesystems do not know how to flush disk
  caches. In these cases disk caches need to be disabled using hdparm(8) or
  sdparm(8) to guarantee safe operation" (`fsync(2)`, *HISTORY*).
- **Node.** The Node docs do not say whether `fs.fsync` issues `F_FULLFSYNC`
  on macOS. They defer to the operating system (see Gaps).

**fsync of the directory after the rename.** The rename changes a *directory
entry*, and fsyncing the file does not make that entry durable. Two primary
sources now state this:

- **Linux** `fsync(2)`, *DESCRIPTION*: "Calling fsync() does not necessarily
  ensure that the entry in the directory containing the file has also reached
  disk. For that an explicit fsync() on a file descriptor for the directory is
  also needed."
- **POSIX** `fsync()`, *APPLICATION USAGE*: "An application that modifies a
  directory, for example, by creating a file in the directory, can invoke
  *fsync*() on the directory to ensure that the directory's entries and file
  attributes are synchronized."

So the last step is to open the containing directory and fsync that
descriptor. What the sources leave unstated:

- **Rename by name.** Neither page names `rename` explicitly. Linux speaks of
  "the entry in the directory containing the file", and POSIX gives creating
  a file as its example. That a rename is covered follows from it changing a
  directory entry, which is an inference.
- **macOS.** The macOS `fsync(2)` page says nothing about directories.
- **Node.** The Node `fs` docs say nothing about fsyncing a directory, or
  about whether `fs.open` on a directory followed by `fs.fsync` works on
  every platform. The docs do say that opening a directory with `'a+'`
  "will return an error" on macOS and Linux while "on Windows and FreeBSD, a
  file descriptor … will be returned" (Node.js v26.13.0, *File system
  flags*). That shows that opening a directory behaves differently from one
  platform to another.

write-file-atomic 6.0.0 does **not** do this step: no `fsync` on the
directory appears anywhere in `lib/index.js` (every `fsync` match is the temp
file's `fd`, lines 119–121 and 225–227). The consequence is inferred from
the Linux text above: after a power loss, a write-file-atomic write can be
lost and the *old* file come back, but the file is never half-written.

### 2.3 Permissions

- **Secure temp-file creation.**
  - Go's `os.CreateTemp` opens with `O_RDWR|O_CREATE|O_EXCL` and mode `0600`,
    retrying with new random names (`go/src/os/tempfile.go`, lines 46–49).
  - Python's `tempfile.mkstemp`: "The file is readable and writable only by
    the creating user ID … The file descriptor is not inherited by children
    of this process" (`mkstemp` docstring, Python 3.9.6).
  - Node gives the same exclusive create with the `'wx'` flag ("Like `'w'`
    but fails if the path exists"). "On POSIX, if the path is a symbolic
    link, using `O_EXCL` returns an error even if the link is to a path that
    does not exist. The exclusive flag might not work with network file
    systems" (Node.js v26.13.0, *File system flags*).

  Exclusive creation means a write never follows a symlink that someone else
  planted at the temp name.
- **Preserving the target's mode.** Because the rename replaces the target
  with a *new* inode, the new file has the temp file's mode, not the old
  file's. write-file-atomic copies `stats.mode` and `uid`/`gid` from the
  existing target unless told otherwise (`lib/index.js`, lines 94–106,
  126–140). Its temp file is opened with plain `'w'` (no `O_EXCL`, line 109),
  so it relies on the hashed name being unique, not on exclusive creation.
- **Node's default file mode.** `fs.writeFileSync` and `fs.writeFile` default
  `mode` to `0o666`, and "The `mode` option only affects the newly created
  file". For `fs.open`, "`mode` sets the file mode (permission and sticky
  bits), but only if the file was created. On Windows, only the write
  permission can be manipulated" (Node.js v26.13.0). The Node docs do not
  mention the umask (see Gaps).
- **Directory mode.** The XDG spec: "If, when attempting to write a file, the
  destination directory is non-existent an attempt should be made to create
  it with permission `0700`" (XDG spec 0.8, section 3). The stricter "MUST
  be owned by the user … Its Unix access mode MUST be 0700" applies only to
  `$XDG_RUNTIME_DIR`, not to `$XDG_STATE_HOME` (same section). The spec does
  not set a mode for the files inside.

### 2.4 Cleaning up stale temp files

- On a normal error, write-file-atomic unlinks the temp file in `finally`
  (`lib/index.js`, line 151).
- On a signal or `process.exit`, it registers a `signal-exit` handler that
  unlinks the temp file (`lib/index.js`, lines 9, 38–46, 86), and removes the
  handler when done (line 150).
- **Limit:** neither runs on `SIGKILL`, a kernel panic or a power loss. That
  is inferred, since no process code runs then. A temp file named
  `<target>.<hash>` can then be left behind.
- No library read here sweeps old temp files on the next start, and the
  sources read show no standard practice for this (see Gaps). Inferred: a
  predictable prefix such as `<target>.` would make such a sweep possible.

### 2.5 Concurrent writers

Atomic rename keeps the file *whole*, but two processes doing
read-modify-write can still **lose an update**: each reads the old list,
appends its own entry, and the last rename wins. This is inferred: it follows
from the steps above. Node's own docs warn about the in-process case: "It is
unsafe to use `fs.writeFile()` multiple times on the same file without
waiting for the callback" (Node.js v26.13.0, `fs.writeFile`).

- **write-file-atomic serializes only within one process.** Its queue is a
  module-level `activeFiles[absoluteName]` map (`lib/index.js`, lines 48–60,
  152–157). Two separate CLI invocations do not share it.
- **Advisory lock on the file.**
  - Go's `lockedfile` package "creates and manipulates files whose contents
    should only change atomically" (lines 5–7).
  - Opening for write takes a write lock (lines 17–23).
  - "If the program exits while a file is locked, the operating system
    releases the lock but may not do so promptly" (lines 37–40).
  - `Transform` locks, reads, transforms and writes back (lines 130–150).

  (All in `go/src/cmd/go/internal/lockedfile/lockedfile.go`.)
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
  file" (bash(1), *HISTORY*).
  - Appending avoids the lost-update race when *adding* entries.
  - But bash then truncates the file to `HISTFILESIZE` lines "After saving
    the history" (same section), which rewrites it.
  - With multi-line entries, bash's `HISTFILESIZE` text says the file "may
    contain more lines than this maximum to avoid leaving partial history
    entries" (bash(1), *HISTFILESIZE*).
  - Whether bash's own rewrite uses temp+rename was not read (see Gaps).

---

## Part 3: asmai-fixture's current store (context only)

What the code does today, read in `src/store.js` at `a6fd3e9`. Nothing here
is a recommendation.

- **Location:** `process.env.ASMAI_FIXTURE_STORE || join(homedir(),
  '.asmai-fixture.json')` (line 6).
  - This is the home-directory dotfile convention, with a tool-specific
    override variable in the style of `HISTFILE` and `LESSHISTFILE`.
  - An empty `ASMAI_FIXTURE_STORE` falls through to the default, because
    `||` treats `''` as false. That matches the XDG spec's "not set or empty"
    rule, and how Go, git and env-paths apply it (§1.2).
  - A relative `ASMAI_FIXTURE_STORE` is used as given, relative to the
    working directory. That is like env-paths, and unlike both the XDG rule
    for its own variables (ignore) and Go (error) (§1.2).
  - `homedir()` is Node's `os.homedir()`, which falls back to the user's
    account entry when `$HOME` is unset (§1.2).
  - The store does not consult `XDG_STATE_HOME`, the directory whose spec
    examples include "recently used files" (§1.1), and has no "off" value
    like less's `-`.
- **Write path:** `rememberGreeting` reads the whole list, pushes one entry
  and calls `writeFileSync(path, JSON.stringify(entries, null, 2) + '\n')`
  (lines 44–52). With Node's default flag `'w'`, that is the in-place
  truncate-and-write of §2.1, with no temp file, no fsync and no rename.
- **Read path already handles damage:** a file that exists but is not valid
  JSON, or not a list of greetings, raises `DamagedStoreError` (lines
  30–42). Per the last commits, the CLI then keeps greeting rather than
  failing (`git log`: "Keep greeting when the store is corrupt or
  unreadable"). A half-written file from §2.1 would land in this path.
- **Concurrency:** read-modify-write with no lock, so the lost-update race
  of §2.5 applies to two `asmai-fixture` processes greeting at the same time.
- **Mode:** a newly created store gets `writeFileSync`'s default mode
  `0o666` (§2.3), less the umask. The umask step is inferred and not stated
  in the Node docs. An existing file keeps its mode, since "The `mode` option
  only affects the newly created file".

The options these findings bear on are where the file lives (§1) and how
it is written (§2). Choosing among them is a decision for the user and is
not made here.

---

## Gaps

These claims are still not tied to a source read for these notes:

1. **POSIX and Linux on durability after a crash.** POSIX and Linux state
   rename atomicity for running processes only. Neither says what is on disk
   after a crash between a rename and a directory fsync, and neither names
   `rename` in its directory-fsync text. That a rename needs the directory
   fsync is inferred from "the entry in the directory" (§2.2).
2. **fsync ordering before rename.** No source read spells out why the file
   must be fsynced *before* the rename. The argument in §2.2 is inferred.
3. **Node.js on Windows and macOS.** The Node docs do not say whether
   `fs.rename` replaces atomically on Windows, or whether `fs.fsync` uses
   `F_FULLFSYNC` on macOS. libuv's source, which would settle both, was not
   read.
4. **Node.js directory fsync.** The Node docs do not document opening a
   directory and fsyncing it, or whether that works on Windows.
5. **umask.** The Node docs give the default mode `0o666` but do not mention
   the umask, and POSIX or Linux `open()` was not read.
6. **Python `os.replace` atomicity.** The local 3.9.6 docstring does not
   state it, and the online documentation was not read (it is outside
   decision 5's sites).
7. **git `lockfile.h` and `tempfile.c` source:** not read. Only the reftable
   design doc's lock+rename procedure was read.
8. **less source code:** not read. So it is unknown whether less picks the
   first existing history file or the first usable location, and whether it
   writes the history file via temp+rename.
9. **bash history-file write mechanics** (temp+rename or in place): not read
   in source.
10. **Stale temp-file sweeping:** no library read implements it, and there is
    no sourced common practice.
11. **Go `renameio` and `cmd/go/internal/robustio`:** not read, so no library
    example of a directory fsync is cited.
12. **env-paths macOS and Windows `log` subpaths:** not read line by line
    (§1.2 table, †).
13. **less on macOS:** the less man page names no macOS location (§1.2
    table, ‡).
14. **Sources read locally in the first pass** (bash, less, git, Go, Python,
    write-file-atomic, env-paths, macOS man pages) were not re-read upstream.
