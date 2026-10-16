"""Negative export assay: sensitive fields/resources are discarded; failures remain failures."""
import json
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
from sanitize import export, audit

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    case = root / 'test-results' / 'failed-case'
    case.mkdir(parents=True)
    canary = 'SENSITIVE_CANARY_DO_NOT_EXPORT'
    (root / 'junit.xml').write_text('<testsuites><testsuite><testcase name="real outage recovery" classname="desktop" time="1">'
        f'<failure message="{canary}">{canary}</failure><system-out>{canary}</system-out>'
        '</testcase></testsuite></testsuites>')
    events = [
        {'type': 'context-options', 'version': 8, 'origin': 'library', 'options': {'storageState': canary}},
        {'type': 'before', 'callId': 'call@1', 'apiName': 'page.goto', 'class': 'Frame', 'method': 'goto',
         'startTime': 1, 'params': {'url': f'http://localhost/?code={canary}', 'headers': {'Cookie': canary}}},
        {'type': 'after', 'callId': 'call@1', 'endTime': 2, 'result': canary, 'error': {'message': canary}},
        {'type': 'frame-snapshot', 'snapshot': canary},
        {'type': 'console', 'text': canary},
    ]
    with zipfile.ZipFile(case / 'trace.zip', 'w') as trace:
        trace.writestr('0-trace.trace', '\n'.join(json.dumps(event) for event in events))
        trace.writestr('0-trace.network', json.dumps({'type': 'resource-snapshot', 'snapshot': {
            'request': {'url': f'http://localhost/?code={canary}', 'headers': [
                {'name': 'Cookie', 'value': f'JSESSIONID={canary}'},
                {'name': 'X-XSRF-TOKEN', 'value': canary}], 'postData': {'text': canary}},
            'response': {'headers': [{'name': 'Set-Cookie', 'value': f'XSRF-TOKEN={canary}; Path=/'}]},
        }}))
        trace.writestr('resources/private.txt', canary)
    (case / 'test-failed-1.png').write_bytes(canary.encode())  # No authorization manifest: never exported.
    export(root)
    files = list((root / 'sanitized').iterdir())
    assert not any(path.suffix == '.png' for path in files)
    for path in files:
        if path.suffix == '.zip':
            with zipfile.ZipFile(path) as trace:
                assert trace.namelist() == ['0-trace.trace']
                assert canary.encode() not in trace.read('0-trace.trace')
                timeline = [json.loads(line) for line in trace.read('0-trace.trace').splitlines()]
                assert timeline[-1]['error']['message'].startswith('Test action failed')
        else:
            assert canary.encode() not in path.read_bytes()
    report = ET.parse(root / 'sanitized' / 'junit.xml').getroot()
    assert report.find('testsuite').get('failures') == '1'
    assert report.find('.//failure') is not None
    (root / 'sanitized' / 'unsafe.txt').write_text(canary)
    try:
        audit(root, root / 'sanitized')
        raise AssertionError('Audit accepted a sensitive value')
    except ValueError:
        pass

# Fail closed: an export whose own allowed fields carry an actual trace secret is refused and nothing is published,
# so CI can upload sanitized/ only when the audit passed.
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    case = root / 'test-results' / 'leaky-case'
    case.mkdir(parents=True)
    secret = 'ACTUAL_SESSION_VALUE_0123456789'
    (root / 'junit.xml').write_text(f'<testsuites><testsuite><testcase name="leak {secret}" time="1"/></testsuite></testsuites>')
    with zipfile.ZipFile(case / 'trace.zip', 'w') as trace:
        trace.writestr('0-trace.trace', '')
        trace.writestr('0-trace.network', json.dumps({'type': 'resource-snapshot', 'snapshot': {
            'request': {'url': 'http://localhost/', 'headers': [{'name': 'Cookie', 'value': f'JSESSIONID={secret}'}]},
            'response': {'headers': []}}}))
    try:
        export(root)
        raise AssertionError('Export published a leaking report')
    except ValueError:
        pass
    assert not (root / 'sanitized').exists(), 'Refused export left shareable files behind'
    assert not (root / 'sanitized.partial').exists(), 'Refused export left staging files behind'
    assert (case / 'trace.zip').exists(), 'Raw local artifacts must stay untouched'

# Infrastructure failure before Playwright reports: nothing to publish.
with tempfile.TemporaryDirectory() as directory:
    export(Path(directory))
    assert not (Path(directory) / 'sanitized').exists()
print('Sanitizer negative canary assay passed; failure preserved; refused exports publish nothing')
