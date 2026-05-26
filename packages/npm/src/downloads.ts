import { NpmClient } from './client.js';

export interface DownloadTrend {
  current: number;
  previous: number;
  trend: 'growing' | 'stable' | 'declining';
  changePercent: number;
}

export async function fetchDownloadStats(
  packageName: string,
  client?: NpmClient
): Promise<DownloadTrend> {
  const npmClient = client ?? new NpmClient();

  try {
    const [current, previous] = await Promise.all([
      npmClient.getDownloads(packageName, 'last-week'),
      npmClient.getDownloads(packageName, 'last-month'),
    ]);

    const weeklyAvgFromMonth = previous.downloads / 4;
    const changePercent = weeklyAvgFromMonth > 0
      ? ((current.downloads - weeklyAvgFromMonth) / weeklyAvgFromMonth) * 100
      : 0;

    let trend: DownloadTrend['trend'] = 'stable';
    if (changePercent > 10) trend = 'growing';
    if (changePercent < -10) trend = 'declining';

    return {
      current: current.downloads,
      previous: previous.downloads,
      trend,
      changePercent: Math.round(changePercent),
    };
  } catch {
    // Non-critical — return neutral data
    return {
      current: 0,
      previous: 0,
      trend: 'stable',
      changePercent: 0,
    };
  }
}
