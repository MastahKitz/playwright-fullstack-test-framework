// Shared parser for KNOWN-FAILURE marker comments.
//
// A marker is one line, sitting directly above a failure's anchor:
//
//   // KNOWN-FAILURE(#123) [<spec>::<test title> | <spec>::<test title>]: <reason> — retriage if this changes
//
// The ` [<spec>::<title> | …]` part is optional — older markers omit it. When
// present it names the test(s) that failed at this line, recorded by the
// results-analysis workflow so the cleanup workflow doesn't have to resolve the
// call graph itself. It sits outside the `(#N)` so a test title containing
// parentheses can't break the parse.

const HEAD_RE = /KNOWN-FAILURE\(#(\d+)\)(?:\s*\[([^\]]*)\])?:\s*(.*)/;

// Parse the marker text (everything from `KNOWN-FAILURE` onward) into
// { issue, tests: [{ spec, title }], reason }, or null if it isn't a marker.
function parseMarkerContent(content) {
  const m = String(content).match(HEAD_RE);
  if (!m) return null;
  const tests = (m[2] || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ref) => {
      const at = ref.indexOf('::');
      return at === -1
        ? { spec: null, title: ref }
        : { spec: ref.slice(0, at).trim(), title: ref.slice(at + 2).trim() };
    });
  return { issue: Number(m[1]), tests, reason: m[3].trim() };
}

// Parse `grep -rn` output (lines of `<file>:<line>:<content>`) into
// [{ file, line, issue, tests, reason }].
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

module.exports = { parseMarkerContent, parseGrepOutput };
