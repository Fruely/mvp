/**
 * Splits the approved YouMe privacy markdown into the blocks the public page renders.
 * Heading markers and list markers are presentation only; line text stays unchanged.
 */
export function youmeDatenschutzBlocks(source) {
  const lines = String(source).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].startsWith("# ") &&
      !lines[index].startsWith("## ") &&
      !lines[index].startsWith("- ")
    ) {
      const raw = lines[index];
      const hardBreak = raw.endsWith("  ");
      paragraph.push({ text: hardBreak ? raw.slice(0, -2) : raw, hardBreak });
      index += 1;
    }
    blocks.push({ type: "p", lines: paragraph });
  }

  return blocks;
}

export function youmeDatenschutzPlainText(source) {
  return youmeDatenschutzBlocks(source)
    .flatMap((block) => {
      if (block.type === "h1" || block.type === "h2") return [block.text];
      if (block.type === "ul") return block.items;
      return block.lines.map((line) => line.text);
    })
    .join("\n");
}
