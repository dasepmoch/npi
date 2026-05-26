import pc from 'picocolors';
import gradient from 'gradient-string';

export function showBanner(): void {
  const title = gradient.pastel('npi');

  console.log('');
  console.log('  ╭─────────────────────────────────╮');
  console.log('  │                                 │');
  console.log(`  │   ${title}                            │`);
  console.log(`  │   ${pc.dim('Intelligent npm assistant')}     │`);
  console.log('  │                                 │');
  console.log('  ╰─────────────────────────────────╯');
  console.log('');
  console.log(pc.dim('  Usage:'));
  console.log(`    ${pc.bold('npi')} ${pc.green('<package>')}          Analyze a package`);
  console.log(`    ${pc.bold('npi install')} ${pc.green('<package>')}  Smart install`);
  console.log(`    ${pc.bold('npi compare')} ${pc.green('<a> <b>')}   Compare packages`);
  console.log(`    ${pc.bold('npi why')} ${pc.green('<package>')}      Explain a package`);
  console.log('');
}
