import { Minus, Square, X, Moon, Sun, Languages } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useLang } from '../contexts/LangContext'
import appIcon from '../assets/icon.png'

export default function TitleBar() {
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useLang()

  return (
    <div
      className="flex items-center justify-between h-10 bg-mole-bg border-b border-mole-border select-none transition-colors duration-300"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2.5 pl-4">
        <div className="w-6 h-6 rounded-md overflow-hidden shadow-sm border border-mole-accent/25 bg-mole-surface">
          <img src={appIcon} alt="Aras icon" className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-mole-text/80">Aras Antivirus</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mole-accent/15 text-mole-accent font-semibold tracking-wider">v1.6.0</span>
      </div>

      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
          className="flex items-center gap-1 px-2.5 h-10 text-mole-text-muted hover:text-mole-text hover:bg-mole-surface/50 transition-colors"
          title={lang === 'tr' ? 'Switch to English' : "Turkce'ye gec"}
        >
          <Languages size={13} />
          <span className="text-[11px] font-medium uppercase">{lang}</span>
        </button>

        <button
          onClick={toggle}
          className="w-10 h-10 flex items-center justify-center text-mole-text-muted hover:text-mole-text hover:bg-mole-surface/50 transition-colors"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="flex ml-1">
          <button
            onClick={() => window.moleAPI.windowMinimize()}
            className="w-11 h-10 flex items-center justify-center text-mole-text-muted hover:bg-mole-surface transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => window.moleAPI.windowMaximize()}
            className="w-11 h-10 flex items-center justify-center text-mole-text-muted hover:bg-mole-surface transition-colors"
          >
            <Square size={11} />
          </button>
          <button
            onClick={() => window.moleAPI.windowClose()}
            className="w-11 h-10 flex items-center justify-center text-mole-text-muted hover:bg-red-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
