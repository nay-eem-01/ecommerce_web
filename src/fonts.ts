// Self-hosted fonts (docs/DESIGN.md): Dela Gothic One for display type and prices, M PLUS 1p for the interface.
// Japanese glyphs appear only in display type (category signs, the 新入荷 sign): src/styles/fonts-jp.css loads just
// the Dela Gothic One slices holding them. M PLUS 1p loads Latin only. Both keep the stylesheet small.
import '@fontsource/dela-gothic-one/latin-400.css'
import './styles/fonts-jp.css'
import '@fontsource/m-plus-1p/latin-400.css'
import '@fontsource/m-plus-1p/latin-500.css'
import '@fontsource/m-plus-1p/latin-700.css'
import '@fontsource/m-plus-1p/latin-800.css'
