// Shared parser for KNOWN-FAILURE marker comments.
//
// A marker is one line, sitting directly above the `test(...)` call it guards,
// with no blank line between:
//
//   // KNOWN-FAILURE(#123): <one-line reason>
//
// The guarded test is derived from position — whatever `test(...)` sits below
// the marker — never from text inside the comment (see `deriveGuardedTitle`).
// A test that fails for two unrelated causes carries two stacked marker lines,
// most recent on top, each its own `// KNOWN-FAILURE(#N):` line.

const HEAD_RE = /KNOWN-FAILURE\(#(\d+)\):\s*(.*)/;

// A `test(...)` / `test.only(...)` / `test.skip(...)` call and its title literal.
// The title is the first argument — a single-, double-, or backtick-quoted
// string. `test.describe(` deliberately does not match: a marker is never placed
// above a describe block, so hitting one means the marker is malformed.
const TEST_CALL_RE = /^\s*test(?:\.(?:only|skip))?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/;

// Is this line another marker line (used when scanning past a stack of them)?
const MARKER_LINE_RE = /^\s*\/\/\s*KNOWN-FAILURE\(#\d+\):/;

// Parse the marker text (everything from `KNOWN-FAILURE` onward) into
// { issue, reason }, or null if it isn't a marker.
function parseMarkerContent(content) {
  const m = String(content).match(HEAD_RE);
  if (!m) return null;
  return { issue: Number(m[1]), reason: m[2].trim() };
}

// Parse `grep -rn` output (lines of `<file>:<line>:<content>`) into
// [{ file, line, issue, reason }]. Marker → test resolution is not done here —
// it needs the file's contents; see `deriveGuardedTitle`.
function parseGrepOutput(text) {
  const markers = [];
  for (const raw of String(text).split('\n')) {
    if (!raw.trim()) continue;
    const first = raw.indexOf(':');
    const second = raw.indexOf(':', first + 1);
    if (first === -1 || second === -1) continue;
    const line = Number(raw.slice(first + 1, second));
    const parsed = parseMarkerContent(raw.slice(second + 1));
    if (!parsed || !Number.isInteger(line)) continue;
    markers.push({ file: raw.slice(0, first), line, ...parsed });
  }
  return markers;
}

// Position-derive the test a marker guards: from the marker line, scan forward
// past any stacked marker lines and blank lines to the next `test(...)` call and
// return its title literal. Anything else in between (a stray statement, a
// `test.describe(`, EOF) means the marker is malformed — throws with a reason
// the caller surfaces.
//
//   lines      — the marker's file, split on '\n' (0-indexed array)
//   markerLine — the marker's 1-based line number (as `grep -n` reports it)
//
// Returns { title, line } where `line` is the 1-based line of the `test(...)` call.
function deriveGuardedTitle(lines, markerLine) {
  for (let i = markerLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // blank — canonical markers have none, tolerate anyway
    if (MARKER_LINE_RE.test(line)) continue; // a stacked marker above the same test
    const m = line.match(TEST_CALL_RE);
    if (m) return { title: m[2], line: i + 1 };
    throw new Error(
      `marker at line ${markerLine} is not directly above a test(...) call ` +
        `(found "${line.trim().slice(0, 60)}" at line ${i + 1})`,
    );
  }
  throw new Error(`marker at line ${markerLine} has no test(...) call below it`);
}

module.exports = { parseMarkerContent, parseGrepOutput, deriveGuardedTitle };
