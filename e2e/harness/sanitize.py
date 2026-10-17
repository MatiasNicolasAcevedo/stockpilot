"""Export a deliberately minimal failure report. Raw Playwright artifacts stay local/ignored.

Allowlist export: statuses/test names, action timing/API names (no params/results/errors/stacks),
and PNG only with a fixture-issued safe SPA screenshot manifest. Never copy HTTP events,
DOM snapshots, source, attachments, bodies, console, cookies, provider URLs or trace resources.
The sanitized trace is an action timeline, not a replacement for the raw local diagnostic trace.
"""
import html
import json
import shutil
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs

ROOT = Path('/artifacts')


def audit(root, destination):
    """Check actual trace cookie/CSRF/code/state/nonce values against every exported text/archive."""
    secrets = set()
    for trace in (root / 'test-results').rglob('trace.zip'):
        with zipfile.ZipFile(trace) as archive:
            for member in archive.namelist():
                if not member.endswith('.network'):
                    continue
                for line in archive.read(member).splitlines():
                    snapshot = json.loads(line).get('snapshot', {})
                    request = snapshot.get('request', {})
                    query = parse_qs(urlparse(request.get('url', '')).query)
                    for key in ('state', 'code', 'nonce'):
                        secrets.update(value for value in query.get(key, []) if len(value) > 8)
                    for direction in ('request', 'response'):
                        for header in snapshot.get(direction, {}).get('headers', []):
                            name, value = header.get('name', '').lower(), header.get('value', '')
                            if name in ('authorization', 'x-xsrf-token') and len(value) > 8:
                                secrets.add(value)
                            if name in ('cookie', 'set-cookie'):
                                for item in value.split(';'):
                                    key, _, content = item.strip().partition('=')
                                    if key in ('JSESSIONID', 'XSRF-TOKEN') and len(content) > 8:
                                        secrets.add(content)
    for path in destination.iterdir():
        if path.suffix == '.zip':
            with zipfile.ZipFile(path) as archive:
                data = b'\n'.join(archive.read(name) for name in archive.namelist())
        else:
            data = path.read_bytes()
        if any(secret.encode() in data for secret in secrets):
            raise ValueError('Sensitive value found in export; sharing prohibited (value withheld)')
    print(f'Sanitized export audit: {len(secrets)} actual sensitive values checked; none exported')


def export(root):
    """Fail closed: build in a staging directory, audit it and only then publish it as sanitized/.

    sanitized/ exists only after a passing audit, so CI may upload it; a refused or interrupted export publishes
    nothing. Both directories are this exporter's derived output; raw artifacts are never touched.
    """
    destination = root / 'sanitized'
    staging = root / 'sanitized.partial'
    for previous in (staging, destination):
        if previous.exists():
            shutil.rmtree(previous)
    source = root / 'junit.xml'
    if not source.exists():
        # A runner infrastructure failure may occur before Playwright writes reports.
        print('No JUnit available; no sanitized product report exported')
        return
    staging.mkdir()
    try:
        summary = write_export(root, source, staging)
        audit(root, staging)
        staging.rename(destination)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    print(summary)


def write_export(root, source, destination):
    original = ET.parse(source).getroot()
    projects = {id(case): suite.get('hostname', 'unspecified') for suite in original.iter('testsuite') for case in suite.findall('testcase')}
    report = ET.Element('testsuites')
    suite = ET.SubElement(report, 'testsuite', name='Chromium real-stack B')
    rows = []
    failures = 0
    for case in original.iter('testcase'):
        # Names originate in versioned tests/projects, never in provider/request input.
        project = projects.get(id(case), 'unspecified')
        if project not in ('desktop', 'mobile', 'unspecified'):
            raise ValueError('Unexpected test project; export refused')
        name = f'[{project}] ' + case.get('name', '')
        failed = case.find('failure') is not None or case.find('error') is not None
        skipped = case.find('skipped') is not None
        clean = ET.SubElement(suite, 'testcase', name=name, classname=case.get('classname', ''), time=case.get('time', '0'))
        if failed:
            failures += 1
            ET.SubElement(clean, 'failure', message='Assertion/test failure; sensitive diagnostics withheld').text = 'Failure retained. Inspect the local raw report for full diagnostics.'
        if skipped:
            ET.SubElement(clean, 'skipped')
        rows.append((name, 'failed' if failed else 'skipped' if skipped else 'passed'))
    suite.set('tests', str(len(rows)))
    suite.set('failures', str(failures))
    suite.set('skipped', str(sum(status == 'skipped' for _, status in rows)))
    ET.ElementTree(report).write(destination / 'junit.xml', encoding='utf-8', xml_declaration=True)
    listing = ''.join(f'<tr><td>{html.escape(name)}</td><td>{status}</td></tr>' for name, status in rows)
    (destination / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Sanitized B report</title>'
        '<h1>Chromium real-stack B</h1><p>Failure status preserved. Action-only traces omit network/DOM/source/values; raw diagnostics remain local.</p>'
        '<table><tr><th>Test</th><th>Status</th></tr>' + listing + '</table></html>', encoding='utf-8')
    trace_count = 0
    links = []
    for trace in (root / 'test-results').rglob('trace.zip'):
        trace_count += 1
        links.append(f'<li><a href="trace-{trace_count}.zip">{html.escape(trace.parent.name)} — action trace</a></li>')
        with zipfile.ZipFile(trace) as source_zip, zipfile.ZipFile(destination / f'trace-{trace_count}.zip', 'w', zipfile.ZIP_DEFLATED) as target:
            for member in source_zip.namelist():
                if not member.endswith('.trace'):
                    continue
                events = []
                for line in source_zip.read(member).splitlines():
                    event = json.loads(line)
                    if event.get('type') not in ('before', 'after', 'context-options'):
                        continue
                    if event['type'] == 'context-options':
                        safe = {key: event[key] for key in ('version', 'type', 'origin', 'browserName', 'wallTime', 'monotonicTime', 'platform', 'contextId') if key in event}
                        safe['options'] = {}
                    else:
                        safe = {key: event[key] for key in ('type', 'callId', 'parentId', 'startTime', 'endTime', 'class', 'method', 'apiName') if key in event}
                        if event['type'] == 'before':
                            safe['params'] = {}
                        if 'error' in event:
                            safe['error'] = {'name': 'Error', 'message': 'Test action failed; sensitive details withheld'}
                    events.append(json.dumps(safe))
                target.writestr(member, '\n'.join(events))
    # Screenshot authorization is written only at a same-origin SPA page with no sensitive URL.
    for manifest in (root / 'test-results').rglob('safe-screenshot.json'):
        info = json.loads(manifest.read_text())
        if info != {'safe': True}:
            raise ValueError('Invalid screenshot manifest')
        screenshot = manifest.parent / 'safe-failure.png'
        if screenshot.exists():
            name = f'screenshot-{len(list(destination.glob("*.png"))) + 1}.png'
            shutil.copyfile(screenshot, destination / name)
            links.append(f'<li><a href="{name}">{html.escape(manifest.parent.name)} — screenshot</a></li>')
    page = destination / 'index.html'
    page.write_text(page.read_text(encoding='utf-8').replace('</html>', '<ul>' + ''.join(links) + '</ul></html>'), encoding='utf-8')
    return f'Sanitized export: tests={len(rows)} failures={failures} action-traces={trace_count}; raw artifacts remain local'


if __name__ == '__main__':
    export(ROOT)
