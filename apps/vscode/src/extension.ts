import * as vscode from 'vscode';
import { PackageAnalyzer } from '@npi/analyzer';
import { ExplanationEngine } from '@npi/explanation-engine';
import type { PackageAnalysis } from '@npi/core';

let diagnosticCollection: vscode.DiagnosticCollection;
const analyzer = new PackageAnalyzer();
const explanationEngine = new ExplanationEngine();

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  return ((...args: unknown[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('npi');
  context.subscriptions.push(diagnosticCollection);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('npi.analyzePackage', analyzePackageCommand),
    vscode.commands.registerCommand('npi.auditDependencies', auditDependenciesCommand),
    vscode.commands.registerCommand('npi.comparePackages', comparePackagesCommand),
    vscode.commands.registerCommand('npi.whyPackage', whyPackageCommand),
  );

  // Watch package.json for changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');
  watcher.onDidChange(debounce(onPackageJsonChange, 2000));
  watcher.onDidCreate(debounce(onPackageJsonChange, 2000));
  context.subscriptions.push(watcher);

  // Run initial audit if package.json exists
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const pkgJsonUri = vscode.Uri.joinPath(folder.uri, 'package.json');
      onPackageJsonChange(pkgJsonUri);
    }
  }
}

export function deactivate() {
  diagnosticCollection?.dispose();
}

// ─── HTML Security ───────────────────────────────────────────────────────────

/**
 * Escape HTML to prevent injection from external metadata.
 * All data from npm/GitHub/plugins MUST pass through this before rendering.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Generate a nonce for Content Security Policy.
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function analyzePackageCommand() {
  const packageName = await vscode.window.showInputBox({
    prompt: 'Enter package name to analyze',
    placeHolder: 'e.g., lodash, axios, dayjs',
  });

  if (!packageName) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Analyzing ${packageName}...` },
    async () => {
      try {
        const analysis = await analyzer.analyze(packageName);
        showAnalysisPanel(analysis);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to analyze ${packageName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

async function auditDependenciesCommand() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Auditing dependencies...' },
    async () => {
      try {
        const pkgJsonUri = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
        const content = await vscode.workspace.fs.readFile(pkgJsonUri);
        const pkgJson = JSON.parse(Buffer.from(content).toString('utf-8'));

        const deps = Object.keys(pkgJson.dependencies ?? {});
        const results = await analyzer.analyzeMultiple(deps);

        const issues = results.flatMap((r) => r.recommendations);
        if (issues.length === 0) {
          vscode.window.showInformationMessage('All dependencies look healthy!');
        } else {
          vscode.window.showWarningMessage(
            `Found ${issues.length} issue(s) across ${deps.length} dependencies.`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

async function comparePackagesCommand() {
  const input = await vscode.window.showInputBox({
    prompt: 'Enter packages to compare (space-separated)',
    placeHolder: 'e.g., axios ky got',
  });

  if (!input) return;

  const packages = input.split(/\s+/).filter(Boolean);
  if (packages.length < 2) {
    vscode.window.showWarningMessage('Please enter at least 2 packages to compare.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Comparing packages...' },
    async () => {
      try {
        const results = await analyzer.analyzeMultiple(packages);
        showComparisonPanel(results);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

async function whyPackageCommand() {
  const packageName = await vscode.window.showInputBox({
    prompt: 'Enter package name to explain',
    placeHolder: 'e.g., moment, lodash, request',
  });

  if (!packageName) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Researching ${packageName}...` },
    async () => {
      try {
        const analysis = await analyzer.analyze(packageName);
        const explanation = explanationEngine.explain(analysis);
        showExplanationPanel(packageName, explanation);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

async function onPackageJsonChange(uri: vscode.Uri) {
  const config = vscode.workspace.getConfiguration('npi');
  if (!config.get<boolean>('showInlineHints', true)) return;

  try {
    const content = await vscode.workspace.fs.readFile(uri);
    const pkgJson = JSON.parse(Buffer.from(content).toString('utf-8'));

    const includeDevDeps = config.get<boolean>('includeDevDependencies', false);
    const maxDeps = config.get<number>('maxDependencies', 30);

    const deps = [
      ...Object.keys(pkgJson.dependencies ?? {}),
      ...(includeDevDeps ? Object.keys(pkgJson.devDependencies ?? {}) : []),
    ].slice(0, maxDeps);

    const diagnostics: vscode.Diagnostic[] = [];
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText();

    for (const dep of deps) {
      try {
        const analysis = await analyzer.analyze(dep, { cache: true });
        for (const rec of analysis.recommendations) {
          if (rec.severity === 'critical' || rec.severity === 'warning') {
            const idx = text.indexOf(`"${dep}"`);
            if (idx >= 0) {
              const pos = document.positionAt(idx);
              const range = new vscode.Range(pos, pos.translate(0, dep.length + 2));
              const severity = rec.severity === 'critical'
                ? vscode.DiagnosticSeverity.Error
                : vscode.DiagnosticSeverity.Warning;

              diagnostics.push(new vscode.Diagnostic(range, rec.message, severity));
            }
          }
        }
      } catch {
        // Skip packages that fail to analyze
      }
    }

    diagnosticCollection.set(uri, diagnostics);
  } catch {
    // Ignore errors reading package.json
  }
}

// ─── Webview Panels ──────────────────────────────────────────────────────────

function showAnalysisPanel(analysis: PackageAnalysis) {
  const panel = vscode.window.createWebviewPanel(
    'npiAnalysis',
    `NPI: ${analysis.package.name}`,
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = generateAnalysisHtml(analysis, panel.webview);
}

function showComparisonPanel(results: PackageAnalysis[]) {
  const panel = vscode.window.createWebviewPanel(
    'npiComparison',
    'NPI: Package Comparison',
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = generateComparisonHtml(results, panel.webview);
}

function showExplanationPanel(name: string, explanation: { whyUsed: string; whyMovedAway?: string; currentSentiment: string; alternatives: string[] }) {
  const panel = vscode.window.createWebviewPanel(
    'npiExplanation',
    `NPI: Why ${name}?`,
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  const nonce = getNonce();
  const safeName = escapeHtml(name);
  const safeWhyUsed = escapeHtml(explanation.whyUsed);
  const safeWhyMovedAway = explanation.whyMovedAway ? escapeHtml(explanation.whyMovedAway) : '';
  const safeSentiment = escapeHtml(explanation.currentSentiment);
  const safeAlternatives = explanation.alternatives.map(escapeHtml);

  panel.webview.html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
<style nonce="${nonce}">body{font-family:system-ui;padding:20px;color:#e0e0e0;background:#1e1e1e}h1{color:#fff}h2{color:#9cdcfe;margin-top:24px}p{line-height:1.6}ul{padding-left:20px}li{margin:4px 0}</style>
</head>
<body>
<h1>${safeName}</h1>
<h2>Why developers used it</h2><p>${safeWhyUsed}</p>
${safeWhyMovedAway ? `<h2>Why the ecosystem moved away</h2><p>${safeWhyMovedAway}</p>` : ''}
<h2>Current sentiment</h2><p>${safeSentiment}</p>
${safeAlternatives.length > 0 ? `<h2>Modern alternatives</h2><ul>${safeAlternatives.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}
</body></html>`;
}

function generateAnalysisHtml(analysis: PackageAnalysis, _webview: vscode.Webview): string {
  const nonce = getNonce();
  const name = escapeHtml(analysis.package.name);
  const desc = escapeHtml(analysis.package.description);

  const recs = analysis.recommendations.map((r) => {
    const cls = r.severity === 'critical' ? 'crit' : 'warn';
    return `<p class="${cls}">${escapeHtml(r.severity.toUpperCase())}: ${escapeHtml(r.message)}</p>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
<style nonce="${nonce}">body{font-family:system-ui;padding:20px;color:#e0e0e0;background:#1e1e1e}h1{color:#fff}table{border-collapse:collapse;width:100%}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #333}th{color:#9cdcfe}.warn{color:#f0ad4e}.crit{color:#d9534f}.good{color:#5cb85c}h2{color:#9cdcfe;margin-top:24px}.note{color:#888;font-size:0.85em;margin-top:24px}</style>
</head>
<body>
<h1>${name}</h1>
<p>${desc}</p>
<table>
<tr><th>Estimated Health</th><td class="${analysis.health.overall >= 70 ? 'good' : 'warn'}">${analysis.health.overall}/100</td></tr>
<tr><th>Bundle Impact</th><td>${escapeHtml(analysis.bundle.level)}</td></tr>
<tr><th>TypeScript</th><td>${escapeHtml(analysis.dx.typescript)}</td></tr>
<tr><th>ESM</th><td>${analysis.dx.esm ? '&#10003;' : '&#10007;'}</td></tr>
<tr><th>Tree Shaking</th><td>${escapeHtml(analysis.bundle.treeShaking)}</td></tr>
<tr><th>Ecosystem</th><td>${escapeHtml(analysis.ecosystem.status)}</td></tr>
</table>
${recs ? `<h2>Recommendations</h2>${recs}` : ''}
<p class="note">Scores are heuristic estimates based on npm/GitHub metadata and curated rules.</p>
</body></html>`;
}

function generateComparisonHtml(results: PackageAnalysis[], _webview: vscode.Webview): string {
  const nonce = getNonce();
  const headers = results.map((r) => `<th>${escapeHtml(r.package.name)}</th>`).join('');
  const rows = [
    ['Estimated Health', ...results.map((r) => `${r.health.overall}/100`)],
    ['Bundle', ...results.map((r) => r.bundle.level)],
    ['TypeScript', ...results.map((r) => r.dx.typescript)],
    ['ESM', ...results.map((r) => r.dx.esm ? '&#10003;' : '&#10007;')],
    ['Ecosystem', ...results.map((r) => r.ecosystem.status)],
  ];

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
<style nonce="${nonce}">body{font-family:system-ui;padding:20px;color:#e0e0e0;background:#1e1e1e}h1{color:#fff}table{border-collapse:collapse;width:100%}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #333}th{color:#9cdcfe}.note{color:#888;font-size:0.85em;margin-top:24px}</style>
</head>
<body>
<h1>Package Comparison</h1>
<table><tr><th></th>${headers}</tr>
${rows.map((row) => `<tr><th>${escapeHtml(row[0])}</th>${row.slice(1).map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}
</table>
<p class="note">Scores are heuristic estimates based on npm/GitHub metadata and curated rules.</p>
</body></html>`;
}
