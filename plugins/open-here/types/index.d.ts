export type Root = string | null

declare module 'claude-code' {
  interface PluginState {
    'open-here': { root: Root }
  }
}
