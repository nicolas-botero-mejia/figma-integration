.cursor/skills/

**Not shipped in this repo.** Install agent skills here (Cursor) or your host’s equivalent.

Required for reliable `use_figma` calls:

```bash
git clone https://github.com/southleft/figma-console-mcp-skills.git /tmp/figma-skills
mkdir -p .cursor/skills
cp -R /tmp/figma-skills/skills/figma-use .cursor/skills/figma-use
```

See **`docs/figma-mcp-and-skills.md`**.
