import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import log from 'electron-log'

export interface PSResult {
  success: boolean
  data: any
  error?: string
}

const activeProcesses = new Map<string, ChildProcess>()
const taskQueue: Array<{ resolve: (v: PSResult) => void; run: () => void }> = []
let runningCount = 0
const MAX_CONCURRENT = 1

function processQueue() {
  while (runningCount < MAX_CONCURRENT && taskQueue.length > 0) {
    const next = taskQueue.shift()!
    runningCount++
    next.run()
  }
}

export function runPowerShell(scriptName: string, args: string[] = [], taskId?: string): Promise<PSResult> {
  return new Promise((outerResolve) => {
    const entry = {
      resolve: outerResolve,
      run: () => runPowerShellInternal(scriptName, args, taskId).then(result => {
        runningCount--
        outerResolve(result)
        processQueue()
      }),
    }
    taskQueue.push(entry)
    processQueue()
  })
}

function runPowerShellInternal(scriptName: string, args: string[] = [], taskId?: string): Promise<PSResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../../../backend/ps', scriptName)
    const psArgs = [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-NonInteractive',
      '-File', scriptPath,
      ...args,
    ]

    log.info(`[PS] Running: ${scriptName} ${args.join(' ')}`)

    const proc = spawn('powershell.exe', psArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    if (taskId) {
      activeProcesses.set(taskId, proc)
    }

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      if (taskId) activeProcesses.delete(taskId)

      if (code !== 0) {
        log.error(`[PS] ${scriptName} failed: ${stderr}`)
        resolve({ success: false, data: null, error: stderr || `Exit code ${code}` })
        return
      }

      try {
        const data = JSON.parse(stdout.trim())
        resolve({ success: true, data })
      } catch {
        resolve({ success: true, data: stdout.trim() })
      }
    })

    proc.on('error', (err) => {
      if (taskId) activeProcesses.delete(taskId)
      log.error(`[PS] spawn error: ${err.message}`)
      resolve({ success: false, data: null, error: err.message })
    })
  })
}

export function cancelTask(taskId: string): boolean {
  const proc = activeProcesses.get(taskId)
  if (proc) {
    proc.kill()
    activeProcesses.delete(taskId)
    log.info(`[PS] Task ${taskId} cancelled`)
    return true
  }
  return false
}
