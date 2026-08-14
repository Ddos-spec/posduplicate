import path from 'path';

/**
 * Resolve a child path and prove that it remains below the supplied root.
 * The relative-path check is portable across Windows and POSIX path rules.
 */
export const resolvePathWithin = (root: string, ...segments: string[]): string => {
  // Security invariant: path.relative below rejects absolute and parent traversal.
  const resolvedRoot = path.resolve(root); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const candidate = path.resolve(resolvedRoot, ...segments); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const relative = path.relative(resolvedRoot, candidate);

  if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error('Resolved path is outside the permitted storage root');
  }

  return candidate;
};
