const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Theme Provider importunu en başa ekle
if (!code.includes('import { ThemeProvider, useTheme }')) {
  code = code.replace(
    'import { Analytics } from "@vercel/analytics/react";',
    'import { Analytics } from "@vercel/analytics/react";\nimport { ThemeProvider, useTheme } from "next-themes";'
  );
}

// 2. Buton Component'ini dosyanın üst kısımlarına yerleştir
if (!code.includes('const ThemeToggleButton')) {
  code = code.replace(
    'const TradingViewLiveTicker',
    `const ThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();
  return (
    <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️ LIGHT MODE' : '🌙 DARK MODE'}
    </span>
  );
};\n\nconst TradingViewLiveTicker`
  );
}

// 3. Butonu Footer menüsüne (ABOUT US yanına) ekle
if (!code.includes('<ThemeToggleButton />')) {
  code = code.replace(
    '<span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setModalType(\'about\')}>ABOUT US</span>',
    '<span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setModalType(\'about\')}>ABOUT US</span>\n          <ThemeToggleButton />'
  );
}

// 4. Ana div'i ThemeProvider ile sar
if (!code.includes('<ThemeProvider attribute="class" defaultTheme="dark">')) {
  code = code.replace(
    '<div className="app-container"',
    '<ThemeProvider attribute="class" defaultTheme="dark">\n    <div className="app-container"'
  );
  code = code.replace(
    '      <Analytics />\n    </div>',
    '      <Analytics />\n    </div>\n    </ThemeProvider>'
  );
}

// 5. CSS içine aydınlık mod renklerini ekle
if (!code.includes('.light-mode')) {
  code = code.replace(
    '.app-container { zoom: 0.8; }',
    `.app-container { zoom: 0.8; }
        :root[class~="light"] .app-container { background: #f5f5f5 !important; color: #111 !important; }
        :root[class~="light"] .news-card, :root[class~="light"] .archive-card { background: #ffffff !important; border: 1px solid #ddd !important; }
        :root[class~="light"] .tag-pill { background: #eee !important; color: #333 !important; border: 1px solid #ccc !important; }
        :root[class~="light"] .tag-pill.active { background: #c9a96e !important; color: #000 !important; }
        :root[class~="light"] header { background: #ffffff !important; }
        :root[class~="light"] .top-header-container { background: #ffffff !important; }
        :root[class~="light"] h3, :root[class~="light"] h4 { color: #111 !important; }
        :root[class~="light"] .time-select-mini, :root[class~="light"] .font-btn { background: #fff !important; color: #111 !important; border-color: #aaa !important; }
        :root[class~="light"] .search-mini { color: #111 !important; }
        :root[class~="light"] .modal-content { background: #ffffff !important; }
        :root[class~="light"] .shielded-text p { color: #333 !important; }
        :root[class~="light"] .shielded-text h2 { color: #111 !important; }`
  );
}

fs.writeFileSync('src/App.jsx', code);
console.log('✅ Basariyla eklendi!');
