export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'center' | 'custom'
export type Field = { id: string; label: string; value: string; enabled: boolean; automatic?: boolean }
export type TextStyle = { fontFamily: string; fontSize: number; autoScale: boolean; color: string; strokeColor: string; strokeWidth: number; shadow: boolean; opacity: number; lineSpacing: number; letterSpacing: number; align: CanvasTextAlign; weight: '400' | '500' | '700' }
export type TimestampConfig = { fields: Field[]; position: Position; customX: number; customY: number; style: TextStyle }
export type Preset = { name: string; config: TimestampConfig }