import { useState, useEffect } from 'react'
import { Usb, RefreshCw, HardDrive, ShieldAlert, Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface UsbDevice {
  name: string
  driveLetter: string
  serialNumber: string
  sizeGB: number
  fileSystem: string
  hasAutorun: boolean
}

export default function UsbMonitor() {
  const { tx } = useLang()
  const [devices, setDevices] = useState<UsbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [scanningDrive, setScanningDrive] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any>(null)

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.usbMonitor('list-devices')
      if (r.success) {
        const data = Array.isArray(r.data?.results) ? r.data.results : r.data?.results ? [r.data.results] : []
        setDevices(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchDevices() }, [])

  const scanDrive = async (letter: string) => {
    setScanningDrive(letter)
    setScanResult(null)
    try {
      const r = await window.moleAPI.usbMonitor('scan-drive', letter)
      if (r.success) setScanResult(r.data)
    } catch {}
    setScanningDrive(null)
  }

  const checkAutorun = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.usbMonitor('check-autorun')
      if (r.success) setScanResult(r.data)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Usb size={24} className="text-mole-accent" /> {tx('USB Izleme', 'USB Monitor')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Bağlı USB cihazlarını tara ve güvenliğini kontrol et', 'Scan connected USB devices and check their security')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkAutorun}
            className="flex items-center gap-2 px-4 py-2 bg-mole-danger/10 border border-mole-danger/30 text-mole-danger rounded-lg text-sm hover:bg-mole-danger/20 transition-colors">
            <ShieldAlert size={14} /> {tx('Autorun Kontrol', 'Autorun Check')}
          </button>
          <button onClick={fetchDevices} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-mole-surface border border-mole-border rounded-lg text-sm hover:bg-mole-bg transition-colors">
            <RefreshCw size={14} /> {tx('Yenile', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Device cards */}
      {devices.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {devices.map((dev, i) => (
            <div key={i} className="bg-mole-surface rounded-xl p-5 border border-mole-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mole-accent/10 flex items-center justify-center">
                    <HardDrive size={20} className="text-mole-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{dev.name || tx('USB Disk', 'USB Drive')}</p>
                    <p className="text-xs text-mole-text-muted">{tx('Sürücü', 'Drive')} {dev.driveLetter}</p>
                  </div>
                </div>
                {dev.hasAutorun && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-400/10 text-red-400 rounded-full">
                    <AlertTriangle size={10} /> Autorun!
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between text-mole-text-muted">
                  <span>{tx('Boyut', 'Size')}</span><span>{dev.sizeGB?.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between text-mole-text-muted">
                  <span>{tx('Dosya Sistemi', 'File System')}</span><span>{dev.fileSystem || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-mole-text-muted">
                  <span>{tx('Seri No', 'Serial No')}</span><span className="font-mono text-xs">{dev.serialNumber || 'N/A'}</span>
                </div>
              </div>

              <button onClick={() => scanDrive(dev.driveLetter)}
                disabled={scanningDrive === dev.driveLetter}
                className="w-full flex items-center justify-center gap-2 py-2 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                {scanningDrive === dev.driveLetter
                  ? <><Loader2 size={14} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</>
                  : <><Search size={14} /> {tx('Sürücüyü Tara', 'Scan Drive')}</>}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          <Usb size={48} className="text-mole-text-muted mx-auto mb-4" />
          <p className="text-mole-text-muted">{loading ? tx('Cihazlar aranıyor...', 'Searching for devices...') : tx('Bağlı USB cihazı bulunamadı', 'No connected USB device found')}</p>
        </div>
      )}

      {/* Scan results */}
      {scanResult && (
        <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{tx('Tarama Sonuçları', 'Scan Results')}</h2>
            <div className="flex gap-4 text-sm">
              <span className="text-mole-text-muted">{tx('Taranan', 'Scanned')}: <span className="text-mole-text">{scanResult.totalScanned || 0}</span></span>
              <span className="text-mole-text-muted">{tx('Tehdit', 'Threats')}: <span className={`font-bold ${scanResult.threatCount > 0 ? 'text-red-400' : 'text-mole-safe'}`}>{scanResult.threatCount || 0}</span></span>
            </div>
          </div>

          {scanResult.results?.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {scanResult.results.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-mole-bg rounded-lg">
                  <AlertTriangle size={14} className="text-mole-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.fileName || item.description}</p>
                    <p className="text-xs text-mole-text-muted truncate">{item.path}</p>
                    {item.reason && <p className="text-xs text-mole-warning mt-1">{item.reason}</p>}
                    {item.reasons?.map((r: string, j: number) => (
                      <p key={j} className="text-xs text-mole-warning mt-0.5">{r}</p>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-mole-warning">{item.riskScore}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 size={32} className="text-mole-safe mx-auto mb-2" />
              <p className="text-sm text-mole-safe font-medium">{tx('USB sürücüsü temiz!', 'USB drive is clean!')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
