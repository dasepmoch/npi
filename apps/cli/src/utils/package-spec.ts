export interface PackageSpec {
  name: string;
  version?: string;
}

/**
 * Parse a package spec like "react", "react@latest", "@scope/pkg@1.2.3"
 */
export function parsePackageSpec(input: string): PackageSpec {
  if (!input) throw new Error('Package name is required');

  // Scoped package: @scope/name or @scope/name@version
  if (input.startsWith('@')) {
    const slashIdx = input.indexOf('/');
    if (slashIdx === -1) throw new Error(`Invalid scoped package: "${input}"`);

    const afterSlash = input.slice(slashIdx + 1);
    const atIdx = afterSlash.indexOf('@');

    if (atIdx === -1) {
      return { name: input };
    }
    return {
      name: input.slice(0, slashIdx + 1 + atIdx),
      version: afterSlash.slice(atIdx + 1),
    };
  }

  // Non-scoped: name or name@version
  const atIdx = input.indexOf('@');
  if (atIdx === -1) {
    return { name: input };
  }
  return {
    name: input.slice(0, atIdx),
    version: input.slice(atIdx + 1),
  };
}
