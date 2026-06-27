import { execSync } from 'child_process'

export interface DiskSpaceInfo {
  totalGb: number
  availableGb: number
  usedGb: number
  capacityPercent: number
  isCritical: boolean // Less than 1GB free
  isLow: boolean // Less than 5GB free
}

export function checkDiskSpace(): DiskSpaceInfo | null {
  try {
    // df -Pk works on Linux/macOS
    const output = execSync('df -Pk .').toString()
    const lines = output.trim().split('\n')
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      const total = parseInt(parts[1], 10) // in KB
      const used = parseInt(parts[2], 10) // in KB
      const available = parseInt(parts[3], 10) // in KB
      const capacityStr = parts[4] // e.g. "17%"
      const capacityPercent = parseInt(capacityStr.replace('%', ''), 10)
      
      const availableGb = available / (1024 * 1024)
      const totalGb = total / (1024 * 1024)
      const usedGb = used / (1024 * 1024)

      return {
        totalGb: parseFloat(totalGb.toFixed(2)),
        availableGb: parseFloat(availableGb.toFixed(2)),
        usedGb: parseFloat(usedGb.toFixed(2)),
        capacityPercent,
        isCritical: availableGb < 1.0, // Less than 1GB free
        isLow: availableGb < 5.0,     // Less than 5GB free
      }
    }
  } catch (err) {
    // Fallback for Windows environments (e.g. native Windows development)
    try {
      if (process.platform === 'win32') {
        const output = execSync('wmic logicaldisk where "deviceid=\'C:\'" get freespace,size').toString()
        const lines = output.trim().split(/\r?\n/)
        if (lines.length >= 2) {
          const parts = lines[1].trim().split(/\s+/)
          const free = parseInt(parts[0], 10) // bytes
          const size = parseInt(parts[1], 10) // bytes
          if (!isNaN(free) && !isNaN(size)) {
            const availableGb = free / (1024 * 1024 * 1024)
            const totalGb = size / (1024 * 1024 * 1024)
            const usedGb = totalGb - availableGb
            const capacityPercent = Math.round((usedGb / totalGb) * 100)
            return {
              totalGb: parseFloat(totalGb.toFixed(2)),
              availableGb: parseFloat(availableGb.toFixed(2)),
              usedGb: parseFloat(usedGb.toFixed(2)),
              capacityPercent,
              isCritical: availableGb < 1.0,
              isLow: availableGb < 5.0,
            }
          }
        }
      }
    } catch (winErr) {
      console.error('Error fallbacking to Windows wmic disk check:', winErr)
    }
  }
  return null
}
