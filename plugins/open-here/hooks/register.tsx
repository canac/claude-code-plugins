import type { EngineInterface, Register } from 'claude-code'
import { atom, read, update } from 'claude-code'


const root = atom({ plugin: 'open-here', key: 'root' } as const, null )

async function refresh($: EngineInterface) {
  const dir = await $.session.root()
  await update($, root, () => dir)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)

    return started
  })

  // /cd moves the root without firing CwdChanged, so watch the command itself.
  on('command.run', { command: 'cd' }, async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('classic.CwdChanged', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    // Read only to subscribe: refresh() writing it redraws the band.
    await read($, root)
    const dir = await $.session.root()
    const home = await $.env.get('HOME')
    const inCmux = Boolean(await $.env.get('CMUX_SURFACE_ID'))
    const shown = home && (dir === home || dir.startsWith(`${home}/`)) ? `~${dir.slice(home.length)}` : dir
    const { Box, Button, Text } = $.ui.resolve(e)

    const launch = async (name: string, argv: string[]) => {
      try {
        const { exitCode, stderr } = await $.process.run(argv, { cwd: dir })
        if (exitCode !== 0) {
          $.ui.toast(`${name} failed: ${stderr.trim() || `exit ${exitCode}`}`)
        }
      } catch (err) {
        $.ui.toast(`${name} failed: ${String(err)}`)
      }
    }

    const openTab = async () => {
      try {
        // Target the pane this session lives in, not whichever pane has focus.
        const { stdout } = await $.process.run(['cmux', 'identify'])
        const pane: string | undefined = JSON.parse(stdout)?.caller?.pane_ref
        const argv = ['cmux', 'new-surface', '--type', 'terminal', '--working-directory', dir, '--focus', 'true']
        await launch('cmux', pane ? [...argv, '--pane', pane] : argv)
      } catch (err) {
        $.ui.toast(`cmux failed: ${String(err)}`)
      }
    }

    return (
      <Box>
        <Text dimColor>{shown} </Text>
        {inCmux && <Button key="cmux" plain label="[cmux tab]" onPress={openTab} />}
        {inCmux && <Text> </Text>}
        <Button key="code" plain label="[VS Code]" onPress={() => launch('VS Code', ['code', dir])} />
        <Text> </Text>
        <Button key="zed" plain label="[Zed]" onPress={() => launch('Zed', ['zed', dir])} />
      </Box>
    )
  })
}
