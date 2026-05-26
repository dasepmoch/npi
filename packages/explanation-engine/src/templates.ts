export interface ExplanationTemplate {
  package: string;
  whyUsed: string;
  whyMovedAway: string;
  currentSentiment: string;
  alternatives: string[];
  migrationTip: string;
}

export const explanationTemplates: Record<string, ExplanationTemplate> = {
  moment: {
    package: 'moment',
    whyUsed: 'Moment.js was the first comprehensive date library for JavaScript. It provided an intuitive API for parsing, validating, manipulating, and formatting dates when native Date was painful to use.',
    whyMovedAway: 'The ecosystem moved away because of its large bundle size (72KB), mutable API design that causes subtle bugs, lack of tree-shaking support, and the team themselves recommending alternatives.',
    currentSentiment: 'Considered legacy. The Moment team has put the project in maintenance mode and recommends using modern alternatives for new projects.',
    alternatives: ['dayjs', 'date-fns', 'luxon', 'Temporal API (upcoming)'],
    migrationTip: 'dayjs has a nearly identical API to Moment, making migration straightforward. For functional style, use date-fns.',
  },
  lodash: {
    package: 'lodash',
    whyUsed: 'Lodash became the standard utility library because JavaScript lacked many built-in methods. It provided consistent, performant implementations of common operations across all browsers.',
    whyMovedAway: 'Modern JavaScript (ES2015+) added many native equivalents. The full bundle is 72KB, and most projects only use a handful of functions. Tree-shaking the CJS version is impossible.',
    currentSentiment: 'Still widely used but declining. Developers increasingly prefer native methods, individual lodash imports, or modern alternatives like remeda and es-toolkit.',
    alternatives: ['lodash-es', 'remeda', 'radash', 'es-toolkit', 'native JavaScript'],
    migrationTip: 'Start by replacing lodash methods with native equivalents (map, filter, reduce, Object.entries, etc). For remaining needs, use lodash-es for tree-shaking or remeda for TypeScript-first approach.',
  },
  request: {
    package: 'request',
    whyUsed: 'Request was the de facto HTTP client for Node.js for nearly a decade. It had a simple API and handled many edge cases of HTTP communication.',
    whyMovedAway: 'The maintainers deprecated it in 2020, citing design issues that could not be fixed without breaking changes. It has callback-based API, no Promise support, and a large dependency tree.',
    currentSentiment: 'Fully deprecated. Should not be used in any new project. No security patches are being released.',
    alternatives: ['got', 'ky', 'axios', 'native fetch (Node 18+)', 'ofetch'],
    migrationTip: 'For Node.js, use got for full-featured HTTP or native fetch for simple requests. For universal (browser + Node), use ky or ofetch.',
  },
  axios: {
    package: 'axios',
    whyUsed: 'Axios provided a Promise-based HTTP client that worked in both browser and Node.js with a clean API, interceptors, and automatic JSON parsing.',
    whyMovedAway: 'With native fetch available in Node 18+ and browsers, many developers find axios unnecessary. Lighter alternatives like ky provide similar DX with smaller bundles.',
    currentSentiment: 'Still actively maintained and widely used, but increasingly seen as heavier than necessary for most use cases.',
    alternatives: ['ky', 'ofetch', 'native fetch', 'got (Node-only)'],
    migrationTip: 'For simple requests, native fetch is sufficient. For interceptors and retry logic, ky provides similar features at 3KB vs 13KB.',
  },
  'node-sass': {
    package: 'node-sass',
    whyUsed: 'node-sass was the fastest Sass compiler available, using native C++ bindings to LibSass for compilation speed.',
    whyMovedAway: 'LibSass was deprecated in favor of Dart Sass. node-sass requires native compilation which causes installation issues across platforms and CI environments.',
    currentSentiment: 'Deprecated. The Sass team recommends Dart Sass (the "sass" package) as the canonical implementation.',
    alternatives: ['sass (Dart Sass)'],
    migrationTip: 'Replace "node-sass" with "sass" in your package.json. The API is compatible for most use cases.',
  },
  enzyme: {
    package: 'enzyme',
    whyUsed: 'Enzyme by Airbnb was the standard React testing utility, providing shallow rendering and a jQuery-like API for traversing component output.',
    whyMovedAway: 'React Testing Library promoted testing user behavior over implementation details. Enzyme never fully supported React 18+ hooks and concurrent features.',
    currentSentiment: 'Considered outdated. The React team and community recommend Testing Library for new projects.',
    alternatives: ['@testing-library/react', 'vitest', '@playwright/test'],
    migrationTip: 'Replace shallow rendering with render() from Testing Library. Focus tests on user-visible behavior rather than component internals.',
  },
};
