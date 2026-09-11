// KNOWN-FAILURE marker parsing, shared by build-tracking-inventory.js (reads
// every marker on main) and cleanup-known-failure-markers.js (deletes the
// ones whose test went green). One definition of the marker line format and
// how it resolves to the test(...) it guards, so the two scripts can't drift.
//
// A marker is one line, directly above the `test(...)` it guards, no blank
// line between:
//
//   // KNOWN-FAILURE(#123): <one-line reason>
//
// The guarded test is derived from position (deriveGuardedTitle), never from
// text in the comment — that's what makes a test rename a non-event. Stacked
// markers (one test, two unrelated causes) are two such lines, newest on top.

const HEAD_RE = /KNOWN-FAILURE\(#(\d+)\):\s*(.*)/;
// a `test(...)` / `test.only(...)` / `test.skip(...)` call and its title literal
// (first arg, single/double/backtick quoted). `test.describe(` deliberately
// doesn't match — a marker is never above a describe block.
const TEST_CALL_RE = /^\s*test(?:\.(?:only|skip))?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/;
const MARKER_LINE_RE = /^\s*\/\/\s*KNOWN-FAILURE\(#\d+\):/;

// `<file>:<line>:<content>` grep triples → [{ file, line, issue, reason }].
// Marker → test resolution needs the file contents; see deriveGuardedTitle.
function parseGrepOutput(text) {
  const markers = [];
  for (const raw of String(text).split('\n')) {
    if (!raw.trim()) continue;
    const first = raw.indexOf(':');
    const second = raw.indexOf(':', first + 1);
    if (first === -1 || second === -1) continue;
    const line = Number(raw.slice(first + 1, second));
    const m = raw.slice(second + 1).match(HEAD_RE);
    if (!m || !Number.isInteger(line)) continue;
    markers.push({ file: raw.slice(0, first), line, issue: Number(m[1]), reason: m[2].trim() });
  }
  return markers;
}

// From the marker's 1-based line, scan forward past stacked marker lines and
// blanks to the next `test(...)` call and return its title. Anything else in
// between (a stray statement, a `test.describe(`, EOF) → throws with a reason
// the caller surfaces. `lines` is the file split on '\n' (0-indexed).
function deriveGuardedTitle(lines, markerLine) {
  for (let i = markerLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (MARKER_LINE_RE.test(line)) continue;
    const m = line.match(TEST_CALL_RE);
    if (m) return { title: m[2], line: i + 1 };
    throw new Error(
      `marker at line ${markerLine} is not directly above a test(...) call ` +
        `(found "${line.trim().slice(0, 60)}" at line ${i + 1})`,
    );
  }
  throw new Error(`marker at line ${markerLine} has no test(...) call below it`);
}

module.exports = { HEAD_RE, TEST_CALL_RE, MARKER_LINE_RE, parseGrepOutput, deriveGuardedTitle };
