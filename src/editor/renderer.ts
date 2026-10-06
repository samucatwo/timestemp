import type { TimestampConfig } from './types'

export const getActiveLines = (config: TimestampConfig) =>
  config.fields.filter((field) => field.enabled && field.value.trim())

export function getTimestampFontSize(config: TimestampConfig, imageWidth: number) {
  const scale = config.style.autoScale ? imageWidth / 1920 : 1
  return Math.max(1, config.style.fontSize * scale)
}

export function renderTimestamp(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  config: TimestampConfig,
) {
  const lines = getActiveLines(config)
  if (!lines.length) return

  const scale = config.style.autoScale ? imageWidth / 1920 : 1
  const fontSize = getTimestampFontSize(config, imageWidth)
  const lineHeight = fontSize * config.style.lineSpacing
  const marginX = imageWidth * 0.008
  const marginY = imageHeight * 0.01

  ctx.save()
  const fontFamilies = config.style.fontFamily.includes(',')
    ? config.style.fontFamily
    : `"${config.style.fontFamily}"`
  ctx.font = `${config.style.weight} ${fontSize}px ${fontFamilies}`
  ctx.textBaseline = 'top'
  ctx.textAlign = config.style.align
  ctx.globalAlpha = config.style.opacity
  ctx.lineJoin = 'round'
  const kerningContext = ctx as CanvasRenderingContext2D & { fontKerning?: string }
  if ('fontKerning' in kerningContext) kerningContext.fontKerning = 'normal'

  const totalHeight = fontSize + lineHeight * Math.max(0, lines.length - 1)
  const anchorX = config.position.includes('right')
    ? imageWidth - marginX
    : config.position.includes('center') || config.position === 'center'
      ? imageWidth / 2
      : config.position === 'custom'
        ? imageWidth * (config.customX / 100)
        : marginX
  const anchorY = config.position.includes('bottom')
    ? imageHeight - marginY - totalHeight
    : config.position.includes('top')
      ? marginY
      : config.position === 'center'
        ? (imageHeight - totalHeight) / 2
        : config.position === 'custom'
          ? imageHeight * (config.customY / 100)
          : marginY

  lines.forEach((line, index) => {
    const y = anchorY + index * lineHeight
    const spacing = config.style.letterSpacing * scale

    if (config.style.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, .76)'
      ctx.shadowBlur = Math.max(0.2, 0.75 * scale)
      ctx.shadowOffsetX = 0.7 * scale
      ctx.shadowOffsetY = 0.7 * scale
    }

    if (config.style.strokeWidth > 0) {
      ctx.strokeStyle = config.style.strokeColor === '#000000'
        ? 'rgba(0, 0, 0, .76)'
        : config.style.strokeColor
      ctx.lineWidth = Math.max(0.2, config.style.strokeWidth * scale)
      drawText(ctx, line.value, anchorX, y, spacing, true)
    }

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.fillStyle = config.style.color
    ctx.strokeStyle = config.style.color
    ctx.lineWidth = Math.max(0.2, 0.28 * scale)
    drawText(ctx, line.value, anchorX, y, spacing, true)
    drawText(ctx, line.value, anchorX, y, spacing, false)
  })

  ctx.restore()
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  stroke: boolean,
) {
  const operation = stroke ? ctx.strokeText.bind(ctx) : ctx.fillText.bind(ctx)
  const spacedContext = ctx as CanvasRenderingContext2D & { letterSpacing?: string }

  if (!spacing) {
    operation(text, x, y)
    return
  }

  if ('letterSpacing' in spacedContext) {
    const previousSpacing = spacedContext.letterSpacing
    spacedContext.letterSpacing = `${spacing}px`
    operation(text, x, y)
    spacedContext.letterSpacing = previousSpacing ?? '0px'
    return
  }

  const characters = [...text]
  const totalWidth = characters.reduce((total, character) => total + ctx.measureText(character).width, 0)
    + spacing * Math.max(0, characters.length - 1)
  let cursor = x - (
    ctx.textAlign === 'center'
      ? totalWidth / 2
      : ctx.textAlign === 'right'
        ? totalWidth
        : 0
  )

  characters.forEach((character) => {
    operation(character, cursor, y)
    cursor += ctx.measureText(character).width + spacing
  })
}

export function drawImageWithTimestamp(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  config: TimestampConfig,
) {
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)
  renderTimestamp(ctx, width, height, config)
}
