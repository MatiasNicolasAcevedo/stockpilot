import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

// Playwright API errors can embed callback URLs and cookie values. Never send them to build/CI logs.
export default class SafeReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`B: ${test.parent.project()?.name}: ${test.title}: ${result.status}`);
  }
  onError() { console.error('B: runner error (sensitive diagnostics kept in local raw reports)'); }
  onEnd(result: FullResult) { console.log(`B: suite ${result.status}`); }
}
