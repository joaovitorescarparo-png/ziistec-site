// F2: conservative checks for the deliberately small, dependency-free motion layer.
export function auditMotion(files) {
  for (const [name, raw] of Object.entries(files)) {
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (!/prefers-reduced-motion\s*:\s*reduce/.test(source)) throw new Error(`F2 reduced-motion branch absent: ${name}`);
    if (/animation(?:-iteration-count)?\s*:[^;{}]*\binfinite\b/i.test(source) || /iterations\s*:\s*Infinity/.test(source)) throw new Error(`Motion infinito: ${name}`);
    if (name.endsWith('.css')) {
      // A tiny recursive CSS block walker; selectors are checked separately inside media rules.
      function walk(text, inKeyframes = false) {
        let cursor = 0;
        while (cursor < text.length) {
          const open = text.indexOf('{', cursor);
          if (open < 0) break;
          const selector = text.slice(cursor, open).trim();
          let end = open + 1, depth = 1;
          for (; end < text.length && depth; end++) {
            if (text[end] === '{') depth++;
            if (text[end] === '}') depth--;
          }
          if (depth) throw new Error(`F2 invalid CSS: ${name}`);
          const body = text.slice(open + 1, end - 1);
          if (selector.startsWith('@')) {
            walk(body, inKeyframes || /keyframes/.test(selector));
          } else if (inKeyframes) {
            if (/(?:^|;)\s*(?:width|height|top|left|margin(?:-[\w-]+)?|box-shadow|filter)\s*:/i.test(body)) throw new Error(`F2 layout animation: ${name}`);
          } else {
            const tokensOnly = body.split(';').every(d => !d.trim() || /^\s*--mo-[\w-]+\s*:/.test(d));
            if (!tokensOnly && selector.split(',').some(s => !/^html\.motion(?:[\s.:#\[]|$)/.test(s.trim()))) throw new Error(`F2 unscoped start state: ${name}`);
            if (tokensOnly && selector.trim() !== '.page-home') throw new Error(`F2 tokens outside page-home: ${name}`);
            for (const [, property, value] of body.matchAll(/(?:^|;)\s*(transition(?:-property)?|animation)\s*:\s*([^;]+)/gi)) {
              if (/\b(?:width|height|top|left|margin(?:-[\w-]+)?|all|box-shadow|filter)\b/i.test(value) && !(selector.includes('::details-content') && !/\b(?:width|top|left|margin|all|box-shadow|filter)\b/i.test(value))) throw new Error(`F2 layout ${property}: ${name}`);
            }
          }
          cursor = end;
        }
      }
      walk(source);
    } else {
      if (/\bpreventDefault\s*\(/.test(source)) throw new Error(`F2 touch/wheel hijacking: ${name}`);
      if (/(?:^|[,{])\s*['"]?(?:width|height|top|left|margin(?:Top|Left|Right|Bottom)?|boxShadow|filter)['"]?\s*:/.test(source)) throw new Error(`F2 layout keyframe: ${name}`);
      if (/\.style\b|setAttribute\s*\(\s*['"]style/.test(source)) throw new Error(`F2 inline style injection: ${name}`);
    }
  }
}
