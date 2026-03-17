import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import AlertDialog from './components/AlertDialog'
import { ThemeProvider } from './contexts/ThemeContext'
import { LangProvider } from './contexts/LangContext'
import Dashboard from './pages/Dashboard'
import DeepClean from './pages/DeepClean'
import DevPurge from './pages/DevPurge'
import Analyze from './pages/Analyze'
import Status from './pages/Status'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import SecurityScan from './pages/SecurityScan'
import Processes from './pages/Processes'
import Quarantine from './pages/Quarantine'
import RepoScan from './pages/RepoScan'
import Realtime from './pages/Realtime'
import WebProtection from './pages/WebProtection'
import UsbMonitor from './pages/UsbMonitor'
import NetworkMonitor from './pages/NetworkMonitor'
import Help from './pages/Help'
import AppUninstaller from './pages/AppUninstaller'
import SystemOptimize from './pages/SystemOptimize'
import InstallerCleanup from './pages/InstallerCleanup'
import Threats from './pages/Threats'
import FileExplorer from './pages/FileExplorer'

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        {/* h-screen min-h-screen z-50 overflow-hidden olarak kesin kısıtlamalar koyalım */}
        <div className="flex flex-col h-screen max-h-screen w-full bg-mole-bg text-mole-text transition-colors duration-300 relative overflow-hidden">
          <TitleBar />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6 relative">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/deep-clean" element={<DeepClean />} />
                <Route path="/dev-purge" element={<DevPurge />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/security-scan" element={<SecurityScan />} />
                <Route path="/realtime" element={<Realtime />} />
                <Route path="/web-protection" element={<WebProtection />} />
                <Route path="/network" element={<NetworkMonitor />} />
                <Route path="/usb" element={<UsbMonitor />} />
                <Route path="/processes" element={<Processes />} />
                <Route path="/repo-scan" element={<RepoScan />} />
                <Route path="/threats" element={<Threats />} />
                <Route path="/quarantine" element={<Quarantine />} />
                <Route path="/status" element={<Status />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/file-explorer" element={<FileExplorer />} />
                <Route path="/app-uninstaller" element={<AppUninstaller />} />
                <Route path="/system-optimize" element={<SystemOptimize />} />
                <Route path="/installer-cleanup" element={<InstallerCleanup />} />
                <Route path="/help" element={<Help />} />
              </Routes>
            </main>
          </div>
          {/* StatusBar her zaman altta kalacak, görünürlüğü artıran z-index */}
          <div className="flex-none basis-8 shrink-0 min-h-[32px] w-full z-50">
            <StatusBar />
          </div>
          <AlertDialog />
        </div>
      </LangProvider>
    </ThemeProvider>
  )
}
