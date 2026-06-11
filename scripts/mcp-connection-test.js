// mcp-connection-test.js — run via use_figma (Plugin API) to verify MCP + file access.
//
// Prerequisites:
//   1. Figma MCP connected and OAuth complete in your editor
//   2. figma-use skill loaded (where your host supports skills)
//   3. Target file open / fileKey set — use a Design-mode URL, not Dev Mode (?m=dev)
//
// Pass: returns ok:true with fileName and collection names.
// Fail: auth errors, missing use_figma tool, or empty/wrong file → see docs/figma-mcp-and-skills.md

const collections = await figma.variables.getLocalVariableCollectionsAsync();

return {
  ok: true,
  fileName: figma.root.name,
  collectionCount: collections.length,
  collections: collections.map((c) => ({
    name: c.name,
    modes: c.modes.map((m) => m.name),
  })),
};
