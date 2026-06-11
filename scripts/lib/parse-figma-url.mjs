/**
 * Parse a Figma file URL into fileKey, fileName, canonical url, and optional nodeId.
 *
 * Supports:
 *   figma.com/design/:fileKey/:fileName
 *   figma.com/design/:fileKey/branch/:branchKey/:fileName  → uses branchKey
 *   figma.com/file/:fileKey/:fileName
 *   figma.com/board/:fileKey/...  (FigJam)
 */

const DESIGN_RE =
  /^https?:\/\/(?:www\.)?figma\.com\/design\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?\/([^/?#]+)/;
const FILE_RE =
  /^https?:\/\/(?:www\.)?figma\.com\/file\/([A-Za-z0-9]+)\/([^/?#]+)/;
const BOARD_RE =
  /^https?:\/\/(?:www\.)?figma\.com\/board\/([A-Za-z0-9]+)(?:\/([^/?#]+))?/;

/**
 * @param {string} input
 * @returns {{
 *   fileKey: string;
 *   fileName: string;
 *   url: string;
 *   nodeId?: string;
 *   editorType: 'design' | 'file' | 'figjam';
 * }}
 */
export function parseFigmaUrl(input) {
  const raw = input?.trim();
  if (!raw) throw new Error('URL is required');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (!url.hostname.replace(/^www\./, '').endsWith('figma.com')) {
    throw new Error('URL must be a figma.com link');
  }

  const href = url.origin + url.pathname;
  let fileKey;
  let fileName;
  let editorType = 'design';

  const design = href.match(DESIGN_RE);
  if (design) {
    fileKey = design[2] ?? design[1];
    fileName = decodeURIComponent(design[3]);
    editorType = 'design';
  } else {
    const file = href.match(FILE_RE);
    if (file) {
      fileKey = file[1];
      fileName = decodeURIComponent(file[2]);
      editorType = 'file';
    } else {
      const board = href.match(BOARD_RE);
      if (board) {
        fileKey = board[1];
        fileName = board[2] ? decodeURIComponent(board[2]) : 'figjam-board';
        editorType = 'figjam';
      }
    }
  }

  if (!fileKey) {
    throw new Error(
      'Could not parse file key from URL. Expected a design/file link like:\n' +
        '  https://www.figma.com/design/FILE_KEY/your-file-name',
    );
  }

  if (!/^[A-Za-z0-9]{10,64}$/.test(fileKey)) {
    throw new Error(`Parsed file key looks invalid: ${fileKey}`);
  }

  const nodeParam = url.searchParams.get('node-id');
  const nodeId = nodeParam ? nodeParam.replace(/-/g, ':') : undefined;

  const warnings = [];
  if (url.searchParams.get('m') === 'dev') {
    warnings.push(
      'URL was copied from Dev Mode (?m=dev). Copy the link from Design mode instead — Dev Mode links often break MCP file access.',
    );
  }

  const canonicalPath =
    editorType === 'figjam'
      ? `/board/${fileKey}/${encodeURIComponent(fileName)}`
      : `/design/${fileKey}/${encodeURIComponent(fileName)}`;

  const canonical = `${url.origin}${canonicalPath}`;

  return {
    fileKey,
    fileName,
    url: canonical,
    ...(nodeId ? { nodeId } : {}),
    editorType,
    ...(warnings.length ? { warnings } : {}),
  };
}

export function parseCollectionsArg(values) {
  if (!values?.length) return [];
  return values
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}
