/**
 * OSV.dev vulnerability database client.
 * Free, open source, maintained by Google. No API key needed.
 * https://osv.dev/
 */

const OSV_API = 'https://api.osv.dev/v1';

export interface OsvVulnerability {
  id: string;
  summary: string;
  details?: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  affected_versions: string;
  fixed_version?: string;
  references: string[];
}

export interface VulnerabilityResult {
  package: string;
  version: string;
  vulnerabilities: OsvVulnerability[];
  queried: boolean;
}

/**
 * Query OSV database for vulnerabilities affecting a specific package version.
 */
export async function queryOsv(packageName: string, version: string): Promise<VulnerabilityResult> {
  try {
    const response = await fetch(`${OSV_API}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version,
        package: {
          name: packageName,
          ecosystem: 'npm',
        },
      }),
    });

    if (!response.ok) {
      return { package: packageName, version, vulnerabilities: [], queried: false };
    }

    const data = await response.json() as { vulns?: OsvVuln[] };
    const vulns = (data.vulns ?? []).map(normalizeVuln);

    return { package: packageName, version, vulnerabilities: vulns, queried: true };
  } catch {
    return { package: packageName, version, vulnerabilities: [], queried: false };
  }
}

interface OsvVuln {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{ ranges?: Array<{ events?: Array<{ fixed?: string }> }> }>;
  references?: Array<{ url: string }>;
}

function normalizeVuln(vuln: OsvVuln): OsvVulnerability {
  const severity = parseSeverity(vuln);
  const fixed = vuln.affected?.[0]?.ranges?.[0]?.events?.find((e) => e.fixed)?.fixed;

  return {
    id: vuln.id,
    summary: vuln.summary ?? 'No description available',
    details: vuln.details,
    severity,
    affected_versions: 'See advisory for details',
    fixed_version: fixed,
    references: (vuln.references ?? []).map((r) => r.url).slice(0, 3),
  };
}

function parseSeverity(vuln: OsvVuln): OsvVulnerability['severity'] {
  const sev = vuln.severity?.[0];
  if (!sev) return 'UNKNOWN';

  if (sev.type === 'CVSS_V3') {
    const score = parseFloat(sev.score);
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MODERATE';
    return 'LOW';
  }

  return 'UNKNOWN';
}
