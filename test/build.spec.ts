import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import path from 'path'
import fs from 'fs'
import os from 'os'

import { build, buildWatch } from '../src/commands/build'
import { defaultValues } from '../src/lib/defaultValues'

chai.use(chaiAsPromised)
chai.should()
const assert = chai.assert

describe('Test for the `build.ts`.', () => {
  const styleYaml = path.join(__dirname, 'data/style.yml')
  const iconSource = path.join(__dirname, 'data/icons')
  let tmpdir = ''
  let styleJson = ''

  beforeEach(function () {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'charites-'))
    styleJson = path.join(tmpdir, 'style.json')
  })

  afterEach(function () {
    const cleanup = [
      'style.json',
      'basic-white.png',
      'basic-white.json',
      'basic-white@2x.png',
      'basic-white@2x.json',
      'icons',
    ]
    cleanup.forEach((fileName) => {
      if (fs.existsSync(fileName)) {
        fs.rmSync(path.join(__dirname, '..', fileName), { recursive: true })
      }
    })
  })

  it('Should convert `data/style.yml` to JSON.', async () => {
    await build(styleYaml, styleJson, { provider: defaultValues.provider })

    // The file should exists.
    assert.deepEqual(true, !!fs.statSync(styleJson))

    const fixtureStyleJson = path.join(__dirname, 'data/style.json')
    assert.equal(
      fs.readFileSync(styleJson, 'utf-8'),
      fs.readFileSync(fixtureStyleJson, 'utf-8'),
    )
  })

  it('Should minify `data/style.yml` to JSON.', async () => {
    await build(styleYaml, styleJson, {
      provider: defaultValues.provider,
      compactOutput: true,
    })

    const contents = fs.readFileSync(styleJson, 'utf-8')
    const lines = contents.split('\n').length

    assert.deepEqual(lines, 1)
  })

  it('Should build command replace sprite url with the option `--sprite-url`.', async () => {
    const expectedUrl = 'http://localhost:8080/icons'

    await build(styleYaml, styleJson, {
      provider: defaultValues.provider,
      spriteUrl: expectedUrl,
      spriteInput: iconSource,
      spriteOutput: tmpdir,
    })

    assert.deepEqual(
      expectedUrl,
      JSON.parse(fs.readFileSync(styleJson, 'utf-8')).sprite,
    )
  })

  it('Should build icons with the option `--sprite-url`. Icon file name is set by spriteUrl', () => {
    const expectedIconName = 'dark'
    const expectedPng = path.join(tmpdir, `${expectedIconName}.png`)
    const expectedJson = path.join(tmpdir, `${expectedIconName}.json`)

    build(styleYaml, styleJson, {
      provider: defaultValues.provider,
      spriteUrl: `http://localhost:8080/${expectedIconName}`,
      spriteInput: iconSource,
      spriteOutput: tmpdir,
    }).then(() => {
      assert.deepEqual(true, !!fs.statSync(expectedPng))
      assert.deepEqual(true, !!fs.statSync(expectedJson))
    })
  })

  it('Use sprite name that specified in style.json with no --sprite-url option', () => {
    const expectedIconName = 'basic-white' // from test/data/style.yml
    const expectedPng = path.join(tmpdir, `${expectedIconName}.png`)
    const expectedJson = path.join(tmpdir, `${expectedIconName}.json`)

    build(styleYaml, styleJson, {
      provider: defaultValues.provider,
      spriteInput: iconSource,
      spriteOutput: tmpdir,
    }).then(() => {
      // The file should exists.
      assert.deepEqual(true, !!fs.statSync(expectedPng))
      assert.deepEqual(true, !!fs.statSync(expectedJson))
    })
  })

  it('Should not create sprite when input directory is not exist.', () => {
    const noExistInputDir = path.join(__dirname, 'data/hellooooo')

    const promise = build(styleYaml, styleJson, {
      provider: defaultValues.provider,
      spriteInput: noExistInputDir,
      spriteOutput: tmpdir,
    })
    return assert.isRejected(
      promise,
      /No such directory. Please specify valid icon input directory. For more help run charites build --help/,
    )
  })

  it('Should watch `*.yml` and convert it to JSON', async () => {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

    const watcher = buildWatch(styleYaml, styleJson, {
      provider: defaultValues.provider,
    })
    await sleep(500)
    const yamlData1 = fs
      .readFileSync(styleYaml, 'utf-8')
      .replace('metadata: {}', 'metadata: aaa')
    fs.writeFileSync(styleYaml, yamlData1)
    await sleep(500)
    await watcher.close()
    assert.deepEqual(true, !!fs.statSync(styleJson))
    assert.deepEqual(
      'aaa',
      JSON.parse(fs.readFileSync(styleJson, 'utf-8')).metadata,
    )
    const yamlData2 = fs
      .readFileSync(styleYaml, 'utf-8')
      .replace('metadata: aaa', 'metadata: {}')
    fs.writeFileSync(styleYaml, yamlData2)
  })
})
