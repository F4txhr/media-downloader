import React from 'react';

const LANGUAGES = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'Python',
  'PHP',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Kotlin',
  'Swift'
];

function BoxShadowPreview({ shadow, background, radius }) {
  const style = {
    boxShadow: shadow,
    background,
    borderRadius: radius,
    width: '220px',
    height: '140px',
    margin: '0 auto',
    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
    transform: 'translateY(0)'
  };

  return (
    <div className="tool-preview">
      <div className="shadow-preview" style={style} />
    </div>
  );
}

function BoxShadowGenerator() {
  const [hOffset, setHOffset] = React.useState(0);
  const [vOffset, setVOffset] = React.useState(12);
  const [blur, setBlur] = React.useState(30);
  const [spread, setSpread] = React.useState(0);
  const [opacity, setOpacity] = React.useState(0.25);
  const [inset, setInset] = React.useState(false);
  const [radius, setRadius] = React.useState(16);
  const [bg, setBg] = React.useState('#151826');

  const shadow = `${inset ? 'inset ' : ''}${hOffset}px ${vOffset}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`;
  const cssCode = `box-shadow: ${shadow};
border-radius: ${radius}px;`;

  function handleCopy() {
    navigator.clipboard
      .writeText(cssCode)
      .catch(() => {});
  }

  return (
    <div className="tool-panel">
      <header className="tool-header">
        <h2>CSS Box-Shadow Generator</h2>
        <p>
          Atur bayangan kartu dengan slider interaktif, lalu salin kode CSS untuk dipakai di
          proyek Anda.
        </p>
      </header>

      <div className="tool-grid">
        <div className="tool-controls">
          <div className="field">
            <span className="field-label">Horizontal offset</span>
            <input
              type="range"
              min="-50"
              max="50"
              value={hOffset}
              onChange={(e) => setHOffset(Number(e.target.value))}
            />
            <span className="field-value">{hOffset}px</span>
          </div>

          <div className="field">
            <span className="field-label">Vertical offset</span>
            <input
              type="range"
              min="-50"
              max="50"
              value={vOffset}
              onChange={(e) => setVOffset(Number(e.target.value))}
            />
            <span className="field-value">{vOffset}px</span>
          </div>

          <div className="field">
            <span className="field-label">Blur</span>
            <input
              type="range"
              min="0"
              max="80"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
            />
            <span className="field-value">{blur}px</span>
          </div>

          <div className="field">
            <span className="field-label">Spread</span>
            <input
              type="range"
              min="-40"
              max="40"
              value={spread}
              onChange={(e) => setSpread(Number(e.target.value))}
            />
            <span className="field-value">{spread}px</span>
          </div>

          <div className="field">
            <span className="field-label">Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
            <span className="field-value">{Math.round(opacity * 100)}%</span>
          </div>

          <div className="field">
            <span className="field-label">Border radius</span>
            <input
              type="range"
              min="0"
              max="40"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <span className="field-value">{radius}px</span>
          </div>

          <label className="field field-inline">
            <input
              type="checkbox"
              checked={inset}
              onChange={(e) => setInset(e.target.checked)}
            />
            <span>Inset shadow</span>
          </label>

          <div className="field">
            <span className="field-label">Background kartu</span>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-side">
          <BoxShadowPreview shadow={shadow} background={bg} radius={`${radius}px`} />
          <div className="code-block">
            <div className="code-block-header">
              <span>CSS yang dihasilkan</span>
              <button type="button" onClick={handleCopy}>
                Salin
              </button>
            </div>
            <pre>
              <code>{cssCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function BorderRadiusGenerator() {
  const [tl, setTl] = React.useState(24);
  const [tr, setTr] = React.useState(24);
  const [br, setBr] = React.useState(24);
  const [bl, setBl] = React.useState(24);

  const cssCode = `border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`;

  function handleCopy() {
    navigator.clipboard
      .writeText(cssCode)
      .catch(() => {});
  }

  const style = {
    borderRadius: `${tl}px ${tr}px ${br}px ${bl}px`,
    width: '220px',
    height: '140px',
    margin: '0 auto',
    background: 'linear-gradient(135deg, #7b5cff, #37b6ff)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
    transition: 'border-radius 0.2s ease'
  };

  return (
    <div className="tool-panel">
      <header className="tool-header">
        <h2>Border Radius Playground</h2>
        <p>
          Eksperimen dengan radius sudut berbeda di tiap sisi dan salin kode CSS-nya untuk
          komponen Anda.
        </p>
      </header>

      <div className="tool-grid">
        <div className="tool-controls">
          <div className="field">
            <span className="field-label">Top-left</span>
            <input
              type="range"
              min="0"
              max="80"
              value={tl}
              onChange={(e) => setTl(Number(e.target.value))}
            />
            <span className="field-value">{tl}px</span>
          </div>
          <div className="field">
            <span className="field-label">Top-right</span>
            <input
              type="range"
              min="0"
              max="80"
              value={tr}
              onChange={(e) => setTr(Number(e.target.value))}
            />
            <span className="field-value">{tr}px</span>
          </div>
          <div className="field">
            <span className="field-label">Bottom-right</span>
            <input
              type="range"
              min="0"
              max="80"
              value={br}
              onChange={(e) => setBr(Number(e.target.value))}
            />
            <span className="field-value">{br}px</span>
          </div>
          <div className="field">
            <span className="field-label">Bottom-left</span>
            <input
              type="range"
              min="0"
              max="80"
              value={bl}
              onChange={(e) => setBl(Number(e.target.value))}
            />
            <span className="field-value">{bl}px</span>
          </div>
        </div>

        <div className="tool-side">
          <div className="tool-preview">
            <div className="radius-preview" style={style} />
          </div>
          <div className="code-block">
            <div className="code-block-header">
              <span>CSS yang dihasilkan</span>
              <button type="button" onClick={handleCopy}>
                Salin
              </button>
            </div>
            <pre>
              <code>{cssCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPaletteTool() {
  const [base, setBase] = React.useState('#6366f1');

  function hexToHsl(hex) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (v) => {
      const hv = Math.round((v + m) * 255).toString(16).padStart(2, '0');
      return hv;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const palette = React.useMemo(() => {
    const { h, s, l } = hexToHsl(base);
    const shades = [];
    const steps = [-20, -10, -5, 0, 5, 10, 20];
    steps.forEach((delta, index) => {
      let nl = Math.max(5, Math.min(95, l + delta));
      const hex = hslToHex(h, s, nl);
      shades.push({
        label: index < 3 ? `Shade ${index + 1}` : index === 3 ? 'Base' : `Tint ${index - 3}`,
        hex
      });
    });
    return shades;
  }, [base]);

  function handleCopy(color) {
    navigator.clipboard
      .writeText(color)
      .catch(() => {});
  }

  return (
    <div className="tool-panel">
      <header className="tool-header">
        <h2>Color Palette Generator</h2>
        <p>
          Pilih satu warna dasar, lalu dapatkan palet shade dan tint otomatis untuk sistem
          desain Anda.
        </p>
      </header>

      <div className="tool-grid tool-grid-single">
        <div className="tool-controls">
          <div className="field">
            <span className="field-label">Warna dasar</span>
            <input
              type="color"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
            <span className="field-value">{base.toUpperCase()}</span>
          </div>
        </div>

        <div className="tool-side">
          <div className="palette-grid">
            {palette.map((item) => (
              <button
                key={item.label}
                type="button"
                className="palette-swatch"
                style={{ background: item.hex }}
                onClick={() => handleCopy(item.hex)}
              >
                <span className="palette-label">{item.label}</span>
                <span className="palette-hex">{item.hex.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <p className="hint-subtext">
            Klik salah satu warna untuk menyalin kode heksadesimal ke clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function SnippetBoilerplateTool() {
  const [language, setLanguage] = React.useState('JavaScript');

  const snippets = {
    JavaScript: `function hello(name) {
  console.log(\`Hello, \${name}!\`);
}

hello('World');`,
    TypeScript: `type User = {
  id: number;
  name: string;
};

function greet(user: User): string {
  return \`Hello, \${user.name}\`;
}`,
    Python: `def greet(name: str) -> str:
    return f"Hello, {name}"

print(greet("World"))`,
    HTML: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Boilerplate</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
  </body>
</html>`,
    CSS: `:root {
  --primary: #6366f1;
}

.button {
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  border: none;
}`
  };

  const code = snippets[language] || '// Snippet belum ditambahkan untuk bahasa ini.';

  function handleCopy() {
    navigator.clipboard
      .writeText(code)
      .catch(() => {});
  }

  return (
    <div className="tool-panel">
      <header className="tool-header">
        <h2>Snippet & Boilerplate</h2>
        <p>
          Pilih bahasa pemrograman untuk mendapatkan snippet dasar yang bisa Anda jadikan
          titik awal.
        </p>
      </header>

      <div className="tool-grid tool-grid-single">
        <div className="tool-controls">
          <div className="field">
            <span className="field-label">Bahasa</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-side">
          <div className="code-block">
            <div className="code-block-header">
              <span>{language} snippet</span>
              <button type="button" onClick={handleCopy}>
                Salin
              </button>
            </div>
            <pre>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTool, setActiveTool] = React.useState('box-shadow');

  function renderTool() {
    if (activeTool === 'box-shadow') {
      return <BoxShadowGenerator />;
    }
    if (activeTool === 'border-radius') {
      return <BorderRadiusGenerator />;
    }
    if (activeTool === 'color-palette') {
      return <ColorPaletteTool />;
    }
    if (activeTool === 'snippets') {
      return <SnippetBoilerplateTool />;
    }
    return null;
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-pill-row">
            <span className="hero-pill">React · Vercel · Web Coding Tools</span>
          </div>
          <h1>Toolkit Koding Serba Guna</h1>
          <p>
            Kumpulan alat kecil untuk membantu Anda mendesain UI dan menulis kode lebih
            cepat: generator CSS, palet warna, snippet multi-bahasa, dan lainnya.
          </p>
          <p className="hero-note">
            Fokus ke logika, biarkan detail kecil seperti shadow dan palet warna diurus
            oleh toolkit ini.
          </p>
        </div>
      </header>

      <main className="main main-with-sidebar">
        <aside className="sidebar">
          <h2 className="sidebar-title">Tools</h2>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={
                'sidebar-item' + (activeTool === 'box-shadow' ? ' sidebar-item-active' : '')
              }
              onClick={() => setActiveTool('box-shadow')}
            >
              CSS Box Shadow
            </button>
            <button
              type="button"
              className={
                'sidebar-item' +
                (activeTool === 'border-radius' ? ' sidebar-item-active' : '')
              }
              onClick={() => setActiveTool('border-radius')}
            >
              Border Radius
            </button>
            <button
              type="button"
              className={
                'sidebar-item' +
                (activeTool === 'color-palette' ? ' sidebar-item-active' : '')
              }
              onClick={() => setActiveTool('color-palette')}
            >
              Color Palette
            </button>
            <button
              type="button"
              className={
                'sidebar-item' + (activeTool === 'snippets' ? ' sidebar-item-active' : '')
              }
              onClick={() => setActiveTool('snippets')}
            >
              Snippet & Boilerplate
            </button>
          </nav>
          <p className="sidebar-footnote">
            Rencana ke depan: formatter, regex helper, JSON viewer, dan generator lain
            untuk berbagai bahasa pemrograman.
          </p>
        </aside>

        <section className="card card-main tools-container">{renderTool()}</section>
      </main>

      <footer className="footer">
        <p>
          React + Vercel · Web coding tools untuk menghemat waktu saat mendesain dan
          menulis kode.
        </p>
      </footer>
    </div>
  );
}

export default App;