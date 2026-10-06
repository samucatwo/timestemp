export const timestampFonts = [
  'Roboto Condensed',
  'Roboto',
  'Open Sans',
  'Inter',
  'IBM Plex Sans',
  'Source Sans 3',
  'Noto Sans',
  'Ubuntu',
  'Lato',
  'Oswald',
  'Archivo Narrow',
  'Barlow Condensed',
  'Arial Narrow',
  'monospace',
]

export async function loadTimestampFont(fontFamily: string, weight: string, size: number) {
  const family = fontFamily.split(',')[0].trim().replaceAll(/["']/g, '')
  await document.fonts.load(`${weight} ${size}px "${family}"`)
  await document.fonts.ready
}