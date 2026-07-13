import type { Plugin } from 'vite'

export function automationPlugin(): Plugin {
  return {
    name: 'lutris-automation',
    configureServer(server) {
      void import('./bridge').then(({ startAutomationBridge }) => {
        startAutomationBridge(server)
      })
    }
  }
}
