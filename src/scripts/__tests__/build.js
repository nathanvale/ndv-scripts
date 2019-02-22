import cases from 'jest-in-case'
import {unquoteSerializer} from '../../helpers/serializers'

jest.mock('../../utils')
jest.mock('rimraf')
jest.mock('../../checkers')

expect.addSnapshotSerializer(unquoteSerializer)

let checkForTypescriptMock, crossSpawnSyncMock

cases(
  'build',
  async ({setup = () => () => {}}) => {
    // beforeEach
    checkForTypescriptMock = require('../../checkers').checkForTypescript
    crossSpawnSyncMock = require('cross-spawn').sync
    const originalExit = process.exit
    process.exit = jest.fn()
    const teardown = setup()
    try {
      await require('../build')
    } catch (error) {
      throw error
    } finally {
      expect(process.exit).toBeCalledWith(0)
      teardown()
    }
    // afterEach
    process.exit = originalExit
    jest.resetModules()
  },
  {
    'with babel should use default args': {
      setup: withJavscript(setupWithArgs()),
    },
    'with babel should ignore files set with --ignore': {
      setup: withJavscript(setupWithArgs(['--ignore', 'somefile.js'])),
    },
    'with babel should not copy files with --no-copy-files': {
      setup: withJavscript(setupWithArgs(['--no-copy-files'])),
    },
    'with babel should compile files to a specified --out-dir': {
      setup: withJavscript(setupWithArgs(['--out-dir'])),
    },
    'with babel should compile files with --presets when using a built in config': {
      setup: withJavscript(withBuiltInConfig(setupWithArgs())),
    },
    'with typescript and no specified extenstions should also compile .ts,.tsx files': {
      setup: withTypescript(setupWithArgs()),
    },
    'with typescript and specified --extensions should only compile specified --extensions': {
      setup: withTypescript(setupWithArgs(['--extensions', '.ts'])),
    },
    'with typescript and specified --source-maps should only compile specified --source-maps': {
      setup: withTypescript(setupWithArgs(['--source-maps'])),
    },
    // TODO: write tests for rollup
    // 'with rollup should use default args': {
    //   setup: withBuiltInConfig(setupWithArgs(['--bundle'])),
    // },
  },
)
function withBuiltInConfig(setupFn) {
  return function setup() {
    const {
      useBuiltInBabelConfig: useBuiltInBabelConfigMock,
      fromConfigs,
    } = require('../../utils')
    useBuiltInBabelConfigMock.mockReturnValue(true)
    fromConfigs.mockReturnValue('~/src/config/babelrc.js')
    const teardownFn = setupFn()
    return function teardown() {
      teardownFn()
    }
  }
}

function withJavscript(setupFn) {
  return function setup() {
    checkForTypescriptMock.mockReturnValue(false)
    const teardownFn = setupFn()
    return function teardown() {
      const [firstCall] = crossSpawnSyncMock.mock.calls
      const [script, calledArgs] = firstCall
      expect(crossSpawnSyncMock).toHaveBeenCalledTimes(1)
      //TODO: raise an issue with wallaby.js on how to mock --dirname
      expect([script, ...calledArgs].join(' ')).toMatchSnapshot()
      teardownFn()
    }
  }
}

function withTypescript(setupFn) {
  return function setup() {
    checkForTypescriptMock.mockReturnValue(true)
    const teardownFn = setupFn()
    return function teardown() {
      const [firstCall, secondCall] = crossSpawnSyncMock.mock.calls
      const [scriptOne, calledArgsOne] = firstCall
      const [scriptTwo, calledArgsTwo] = secondCall
      expect(crossSpawnSyncMock).toHaveBeenCalledTimes(2)
      expect([scriptOne, ...calledArgsOne].join(' ')).toMatchSnapshot()
      expect([scriptTwo, ...calledArgsTwo].join(' ')).toMatchSnapshot()
      teardownFn()
    }
  }
}

function setupWithArgs(args = []) {
  return function setup() {
    const utils = require('../../utils')
    utils.resolveBin = (modName, {executable = modName} = {}) => executable
    const originalArgv = process.argv
    process.argv = ['node', '../build', ...args]
    return function teardown() {
      process.argv = originalArgv
    }
  }
}