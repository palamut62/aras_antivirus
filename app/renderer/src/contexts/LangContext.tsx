import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'tr' | 'en'

const translations: Record<string, Record<Lang, string>> = {
  // Sidebar sections
  'nav.cleanup': { tr: 'Temizlik', en: 'Cleanup' },
  'nav.security': { tr: 'Guvenlik', en: 'Security' },
  'nav.system': { tr: 'Sistem', en: 'System' },
  // Sidebar items
  'nav.dashboard': { tr: 'Kontrol Paneli', en: 'Dashboard' },
  'nav.deepClean': { tr: 'Derin Temizlik', en: 'Deep Clean' },
  'nav.devPurge': { tr: 'Gelistirici Temizle', en: 'Dev Purge' },
  'nav.diskAnalysis': { tr: 'Disk Analizi', en: 'Disk Analysis' },
  'nav.securityScan': { tr: 'Guvenlik Tarama', en: 'Security Scan' },
  'nav.liveProtection': { tr: 'Canli Koruma', en: 'Live Protection' },
  'nav.webProtection': { tr: 'Web Koruma', en: 'Web Protection' },
  'nav.networkMonitor': { tr: 'Ag Izleme', en: 'Network Monitor' },
  'nav.usbMonitor': { tr: 'USB Izleme', en: 'USB Monitor' },
  'nav.processes': { tr: 'Surecler', en: 'Processes' },
  'nav.repoSecurity': { tr: 'Repo Guvenlik', en: 'Repo Security' },
  'nav.threats': { tr: 'Tehdit Veritabanı', en: 'Threat Database' },
  'nav.quarantine': { tr: 'Karantina', en: 'Quarantine' },
  'nav.fileExplorer': { tr: 'Dosya Yoneticisi', en: 'File Explorer' },
  'nav.systemStatus': { tr: 'Sistem Durumu', en: 'System Status' },
  'nav.logs': { tr: 'Gecmis', en: 'Logs' },
  'nav.settings': { tr: 'Ayarlar', en: 'Settings' },
  'nav.appUninstaller': { tr: 'Program Kaldirici', en: 'App Uninstaller' },
  'nav.systemOptimize': { tr: 'Sistem Optimize', en: 'System Optimize' },
  'nav.installerCleanup': { tr: 'Installer Temizle', en: 'Installer Cleanup' },
  'nav.help': { tr: 'Yardim', en: 'Help' },
  // StatusBar
  'status.protectionActive': { tr: 'Koruma Aktif', en: 'Protection Active' },
  'status.protectionOff': { tr: 'Koruma Kapali', en: 'Protection Off' },
  'status.queue': { tr: 'Sirada', en: 'Queued' },
  // Common
  'common.scan': { tr: 'Tara', en: 'Scan' },
  'common.start': { tr: 'Baslat', en: 'Start' },
  'common.stop': { tr: 'Durdur', en: 'Stop' },
  'common.save': { tr: 'Kaydet', en: 'Save' },
  'common.saved': { tr: 'Kaydedildi!', en: 'Saved!' },
  'common.cancel': { tr: 'Iptal', en: 'Cancel' },
  'common.delete': { tr: 'Sil', en: 'Delete' },
  'common.restore': { tr: 'Geri Yukle', en: 'Restore' },
  'common.loading': { tr: 'Yukleniyor...', en: 'Loading...' },
  'common.error': { tr: 'Hata', en: 'Error' },
  'common.total': { tr: 'Toplam', en: 'Total' },
  'common.threat': { tr: 'Tehdit', en: 'Threat' },
  'common.safe': { tr: 'Guvenli', en: 'Safe' },
  // Settings
  'settings.title': { tr: 'Ayarlar', en: 'Settings' },
  'settings.protection': { tr: 'Koruma Ayarlari', en: 'Protection Settings' },
  'settings.general': { tr: 'Genel Ayarlar', en: 'General Settings' },
  'settings.liveProtection': { tr: 'Canli Koruma', en: 'Live Protection' },
  'settings.liveProtectionDesc': { tr: 'Arka planda dosya, ag ve USB izleme', en: 'Background file, network and USB monitoring' },
  'settings.autoStart': { tr: 'Bilgisayar acilinca baslat', en: 'Start on boot' },
  'settings.autoStartDesc': { tr: 'Windows acildiginda uygulama otomatik calissin', en: 'Auto-start when Windows boots' },
  'settings.dryRun': { tr: 'Onizleme modu', en: 'Preview mode' },
  'settings.dryRunDesc': { tr: 'Ilk taramada silme yerine onizleme goster', en: 'Show preview instead of deleting on first scan' },
  'settings.recycleBin': { tr: 'Geri Donusum Kutusu', en: 'Recycle Bin' },
  'settings.recycleBinDesc': { tr: 'Kalici silme yerine Geri Donusum Kutusu kullan', en: 'Use Recycle Bin instead of permanent delete' },
  'settings.logging': { tr: 'Loglama', en: 'Logging' },
  'settings.loggingDesc': { tr: 'Islem loglarini kaydet', en: 'Save operation logs' },
  'settings.protectedPaths': { tr: 'Korunan Klasorler', en: 'Protected Folders' },
  'settings.protectedPathsDesc': { tr: 'Bu klasorler asla silinmez', en: 'These folders are never deleted' },
  'settings.theme': { tr: 'Tema', en: 'Theme' },
  'settings.language': { tr: 'Dil', en: 'Language' },
  // Help
  'help.title': { tr: 'Yardim Merkezi', en: 'Help Center' },
  'help.subtitle': { tr: 'Aras Antivirus kullanim kilavuzu', en: 'Aras Antivirus usage guide' },
  // Dashboard
  'dashboard.title': { tr: 'Kontrol Paneli', en: 'Dashboard' },
  'dashboard.subtitle': { tr: 'Sistem durumu ve hizli islemler', en: 'System status and quick actions' },
  'dashboard.quickScan': { tr: 'Hizli Tarama', en: 'Quick Scan' },
  'dashboard.quickScanDesc': { tr: 'Sisteminizi tarayin. Hicbir dosya silinmez.', en: 'Scan your system. No files are deleted.' },
  'dashboard.startScan': { tr: 'Taramayi Baslat', en: 'Start Scan' },
  'dashboard.scanning': { tr: 'Taraniyor...', en: 'Scanning...' },
}

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  tx: (tr: string, en: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'tr',
  setLang: () => {},
  t: (key) => key,
  tx: (tr) => tr,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('aras-lang') as Lang) || 'tr'
    } catch { return 'tr' }
  })

  useEffect(() => {
    localStorage.setItem('aras-lang', lang)
  }, [lang])

  const t = (key: string): string => {
    return translations[key]?.[lang] || key
  }

  // Inline translation helper: tx('Türkçe metin', 'English text')
  const tx = (tr: string, en: string): string => lang === 'tr' ? tr : en

  return (
    <LangContext.Provider value={{ lang, setLang, t, tx }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
