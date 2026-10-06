import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, PointerEvent } from 'react'
import './App.css'
import './clipboard.css'
import { drawImageWithTimestamp, getTimestampFontSize } from './editor/renderer'
import { loadTimestampFont, timestampFonts } from './editor/fonts'
import type { Field, Position, Preset, TextStyle, TimestampConfig } from './editor/types'

const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const fields: Field[] = [
  { id: 'datetime', label: 'Data e hora', value: '', enabled: true, automatic: true },
  { id: 'coordinates', label: 'Coordenadas', value: '-3,3927S -44,0256W', enabled: true },
  { id: 'address', label: 'Local / endereço', value: 'Estrada Sem Nome', enabled: true },
  { id: 'city', label: 'Cidade', value: 'Presidente Vargas', enabled: true },
  { id: 'state', label: 'Estado', value: 'Maranhão', enabled: true },
  { id: 'code', label: 'Código / identificador', value: 'MAMINFO', enabled: true },
]
const style: TextStyle = { fontFamily: 'Roboto Condensed', fontSize: 44, autoScale: true, color: '#ffffff', strokeColor: '#000000', strokeWidth: 0.95, shadow: true, opacity: 1, lineSpacing: 1.15, letterSpacing: 0.55, align: 'left', weight: '400' }
const baseConfig: TimestampConfig = { fields, position: 'bottom-left', customX: 2, customY: 80, style }
const dateLabel = (date = new Date()) => `${String(date.getDate()).padStart(2, '0')} de ${months[date.getMonth()]} de ${date.getFullYear()} ${date.toLocaleTimeString('pt-BR', { hour12: false })}`
const freshConfig = (): TimestampConfig => ({ ...baseConfig, fields: fields.map((field) => ({ ...field, value: field.automatic ? dateLabel() : field.value })) })
const decodeImageFile = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir esta imagem.')) }
  image.src = url
})
const showImageLoadError = (message: string) => {
  document.querySelector('.image-load-error')?.remove()
  const toast = document.createElement('div')
  toast.className = 'image-load-error'
  toast.setAttribute('role', 'status')
  toast.textContent = message
  document.body.append(toast)
  window.setTimeout(() => toast.remove(), 4500)
}

function App() {
  const [config, setConfig] = useState(freshConfig); const [image, setImage] = useState<HTMLImageElement | null>(null); const [fileName, setFileName] = useState(''); const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg'); const [quality, setQuality] = useState(95); const [notice, setNotice] = useState(''); const [presetName, setPresetName] = useState(''); const [presets, setPresets] = useState<Preset[]>(() => JSON.parse(localStorage.getItem('stamp-presets') || '[]'))
  const canvasRef = useRef<HTMLCanvasElement>(null); const stageRef = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null); const loadFileRef = useRef<(file?: File) => void>(() => undefined)
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage || !image) return

    let drawVersion = 0
    const renderPreview = async () => {
      const version = ++drawVersion
      const fit = Math.min(
        1,
        Math.max(1, stage.clientWidth - 64) / image.naturalWidth,
        Math.max(1, Math.min(window.innerHeight * 0.68, 960)) / image.naturalHeight,
      )
      const cssWidth = Math.max(1, Math.round(image.naturalWidth * fit))
      const cssHeight = Math.max(1, Math.round(image.naturalHeight * fit))
      const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
      canvas.width = Math.round(cssWidth * pixelRatio)
      canvas.height = Math.round(cssHeight * pixelRatio)
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`

      const context = canvas.getContext('2d')
      if (!context) return
      const fontSize = getTimestampFontSize(config, canvas.width)
      await loadTimestampFont(config.style.fontFamily, config.style.weight, fontSize)
      if (version !== drawVersion) return
      drawImageWithTimestamp(context, image, canvas.width, canvas.height, config)
    }

    const observer = new ResizeObserver(() => { void renderPreview() })
    const handleWindowResize = () => { void renderPreview() }
    observer.observe(stage)
    window.addEventListener('resize', handleWindowResize)
    void renderPreview()
    return () => { drawVersion += 1; observer.disconnect(); window.removeEventListener('resize', handleWindowResize) }
  }, [image, config])
  const update = (patch: Partial<TimestampConfig>) => setConfig((current) => ({ ...current, ...patch })); const updateStyle = (patch: Partial<TextStyle>) => setConfig((current) => ({ ...current, style: { ...current.style, ...patch } })); const updateField = (id: string, patch: Partial<Field>) => update({ fields: config.fields.map((field) => field.id === id ? { ...field, ...patch } : field) })
  const loadFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice('Selecione ou cole um arquivo de imagem.'); return }
    setNotice('')
    try {
      const nextImage = await decodeImageFile(file)
      setImage(nextImage)
      setFileName(file.name || `imagem-colada.${file.type.split('/')[1] || 'png'}`)
    } catch {
      const message = 'Não foi possível carregar essa imagem. Tente outro arquivo.'
      setNotice(message)
      showImageLoadError(message)
    }
  }
  useEffect(() => { loadFileRef.current = loadFile })
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboard = event.clipboardData
      if (!clipboard) return
      const imageItem = Array.from(clipboard.items).find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      const imageFile = imageItem?.getAsFile() ?? Array.from(clipboard.files).find((file) => file.type.startsWith('image/'))
      if (!imageFile) return
      event.preventDefault()
      void loadFileRef.current(imageFile)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])
  const moveField = (index: number, direction: -1 | 1) => { const next = [...config.fields]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; update({ fields: next }) }
  const exportImage = async () => {
    if (!image) return
    const output = document.createElement('canvas')
    output.width = image.naturalWidth
    output.height = image.naturalHeight
    const context = output.getContext('2d')
    if (!context) return

    await loadTimestampFont(config.style.fontFamily, config.style.weight, getTimestampFontSize(config, image.naturalWidth))
    drawImageWithTimestamp(context, image, output.width, output.height, config)
    const png = format === 'png'
    const mimeType = png ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      output.toBlob(resolve, mimeType, png ? undefined : quality / 100)
    })
    if (!blob) return

    const link = document.createElement('a')
    link.download = `foto_timestamp_${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.${png ? 'png' : 'jpg'}`
    const url = URL.createObjectURL(blob)
    link.href = url
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Imagem gerada com sucesso')
  }
  const savePreset = () => { if (!presetName.trim()) return; const next = [...presets.filter((item) => item.name !== presetName.trim()), { name: presetName.trim(), config }]; setPresets(next); localStorage.setItem('stamp-presets', JSON.stringify(next)); setPresetName(''); setNotice('Preset salvo') }
  const handleCanvasPointer = (event: PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas || config.position !== 'custom') return; if (event.type === 'pointerdown') canvas.setPointerCapture(event.pointerId); if (!canvas.hasPointerCapture(event.pointerId)) return; const box = canvas.getBoundingClientRect(); update({ customX: Math.max(1, Math.min(99, ((event.clientX - box.left) / box.width) * 100)), customY: Math.max(1, Math.min(99, ((event.clientY - box.top) / box.height) * 100)) }) }
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]) }

  return <div className="app-shell"><header className="topbar"><div className="brand-mark">TS</div><div><div className="eyebrow">IMAGE MARKER / LOCAL PROCESSING</div><h1>Timestamp Studio</h1></div><div className="privacy"><i /> processado neste dispositivo</div></header>{!image ? <main className="empty"><div className="drop-zone" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={drop}><div className="upload">↑</div><h2>Carimbe uma foto com contexto.</h2><p>Arraste uma imagem aqui ou selecione um arquivo para começar.</p><span>JPG · PNG · WEBP</span><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0])} /></div><div className="empty-foot"><span>Privacidade por padrão</span><span>Exportação em resolução original</span><span>Canvas pixel-perfect</span></div></main> : <main className="workspace"><section className="preview"><div className="kicker"><span>01 / PREVIEW</span><span>{image.naturalWidth} × {image.naturalHeight} px</span></div><div className="stage" ref={stageRef}><canvas ref={canvasRef}
        className={config.position === 'custom' ? 'draggable' : ''}
        onPointerDown={handleCanvasPointer}
        onPointerMove={handleCanvasPointer}
      /></div><div className="meta"><span>{fileName}</span><button onClick={() => { setImage(null); setFileName('') }}>Trocar foto</button></div><button className="export" onClick={exportImage}>Exportar imagem <b>↓</b></button>{notice && <div className="notice">{notice}</div>}</section><aside className="controls"><div className="control-head"><div><div className="kicker">02 / CONFIGURAÇÃO</div><h2>Dados do carimbo</h2></div><button onClick={() => setConfig(freshConfig())}>Restaurar padrão</button></div><section><div className="section-title">Campos <small>{config.fields.filter((field) => field.enabled).length} ativos</small></div>{config.fields.map((field, index) => <div className="field-row" key={field.id}><input type="checkbox" checked={field.enabled} onChange={(event) => updateField(field.id, { enabled: event.target.checked })} /><div><input className="label" value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} /><input value={field.value} onChange={(event) => updateField(field.id, { value: event.target.value, automatic: false })} /></div><span className="row-actions"><button onClick={() => moveField(index, -1)}>↑</button><button onClick={() => moveField(index, 1)}>↓</button>{!field.automatic && <button onClick={() => update({ fields: config.fields.filter((item) => item.id !== field.id) })}>×</button>}</span></div>)}<button className="add" onClick={() => update({ fields: [...config.fields, { id: `custom-${Date.now()}`, label: 'Novo campo', value: 'Novo valor', enabled: true }] })}>+ Adicionar campo</button></section><section><label>Posição<select value={config.position} onChange={(event) => update({ position: event.target.value as Position })}><option value="bottom-left">Inferior esquerdo</option><option value="bottom-right">Inferior direito</option><option value="top-left">Superior esquerdo</option><option value="top-right">Superior direito</option><option value="top-center">Centro superior</option><option value="bottom-center">Centro inferior</option><option value="center">Centro</option><option value="custom">Personalizada</option></select></label>{config.position === 'custom' && <div className="coords"><label>X <input type="number" value={Math.round(config.customX)} onChange={(event) => update({ customX: Number(event.target.value) })} />%</label><label>Y <input type="number" value={Math.round(config.customY)} onChange={(event) => update({ customY: Number(event.target.value) })} />%</label></div>}</section><section><div className="section-title">Estilo do texto</div><div className="twocol"><label>Fonte<select value={config.style.fontFamily} onChange={(event) => updateStyle({ fontFamily: event.target.value })}>{timestampFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><label>Peso<select value={config.style.weight} onChange={(event) => updateStyle({ weight: event.target.value as TextStyle['weight'] })}><option value="400">Normal</option><option value="500">Médio</option><option value="700">Negrito</option></select></label></div><div className="range"><label>Tamanho <output>{config.style.fontSize}px</output></label><input type="range" min="12" max="96" value={config.style.fontSize} onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })} /></div><label className="switch"><input type="checkbox" checked={config.style.autoScale} onChange={(event) => updateStyle({ autoScale: event.target.checked })} /> Escala automática por resolução</label><div className="twocol colors"><label>Texto <input type="color" value={config.style.color} onChange={(event) => updateStyle({ color: event.target.value })} /></label><label>Contorno <input type="color" value={config.style.strokeColor} onChange={(event) => updateStyle({ strokeColor: event.target.value })} /></label></div><div className="range"><label>Contorno <output>{config.style.strokeWidth.toFixed(1)} px</output></label><input type="range" min="0" max="6" step=".1" value={config.style.strokeWidth} onChange={(event) => updateStyle({ strokeWidth: Number(event.target.value) })} /></div><div className="twocol"><label>Alinhamento<select value={config.style.align} onChange={(event) => updateStyle({ align: event.target.value as CanvasTextAlign })}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><label>Entre linhas<input type="number" value={config.style.lineSpacing} onChange={(event) => updateStyle({ lineSpacing: Number(event.target.value) })} /></label></div><label className="switch"><input type="checkbox" checked={config.style.shadow} onChange={(event) => updateStyle({ shadow: event.target.checked })} /> Sombra preta sutil</label></section><section><div className="section-title">Presets</div><div className="preset-input"><input placeholder="Nome do preset" value={presetName} onChange={(event) => setPresetName(event.target.value)} /><button onClick={savePreset}>Salvar</button></div>{presets.map((preset) => <div className="preset" key={preset.name}><button onClick={() => setConfig(preset.config)}>{preset.name}</button><button onClick={() => { const next = presets.filter((item) => item.name !== preset.name); setPresets(next); localStorage.setItem('stamp-presets', JSON.stringify(next)) }}>×</button></div>)}<div className="quick"><button onClick={() => updateStyle({ shadow: false, strokeWidth: 1.6 })}>Câmera clássica</button><button onClick={() => updateStyle({ shadow: true, strokeWidth: 0 })}>Com sombra</button><button onClick={() => updateStyle({ shadow: false, strokeWidth: 2, letterSpacing: .7, lineSpacing: 7 })}>Técnico</button></div></section><section><div className="section-title">Exportação</div><label>Formato<select value={format} onChange={(event) => setFormat(event.target.value as 'jpeg' | 'png')}><option value="jpeg">JPG</option><option value="png">PNG sem perda</option></select></label>{format === 'jpeg' && <div className="range"><label>Qualidade <output>{quality}%</output></label><input type="range" min="60" max="100" step="5" value={quality}
        onChange={(event) => setQuality(Number(event.target.value))} /></div>}</section></aside></main>}</div>
}
export default App
