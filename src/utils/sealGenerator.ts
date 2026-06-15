/**
 * 電子印鑑生成ユーティリティ
 * 申請者の名字から赤い丸型のシャチハタ風印鑑を生成
 */

export interface SealOptions {
  size?: number; // デフォルト: 120px
  fontSize?: number; // デフォルト: 32px
  color?: string; // デフォルト: #c41e3a (赤)
}

/**
 * ユーザー名から名字を抽出（最初の2文字）
 */
export function extractSurname(fullName: string): string {
  if (!fullName || fullName.length < 2) return fullName;
  return fullName.substring(0, 2);
}

/**
 * キャンバスから透過PNG画像を生成
 */
export function generateSealImage(
  surname: string,
  options: SealOptions = {}
): string {
  const size = options.size || 120;
  const fontSize = options.fontSize || 32;
  const color = options.color || '#c41e3a'; // 赤色

  // キャンバスを作成
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 背景を透過に
  ctx.clearRect(0, 0, size, size);

  // 外枠（円）を描画（赤い枠線）
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();

  // 中身を赤く塗りつぶし
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.fill();

  // テキスト（名字）を白色で描画
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px 'Arial', 'Hiragino Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 複数文字の場合は縦書き風に配置
  const chars = surname.split('');
  const charSpacing = fontSize * 1.2;
  const totalHeight = (chars.length - 1) * charSpacing;
  const startY = size / 2 - totalHeight / 2;

  chars.forEach((char, index) => {
    const y = startY + index * charSpacing;
    ctx.fillText(char, size / 2, y);
  });

  // キャンバスを画像（DataURL）に変換
  return canvas.toDataURL('image/png');
}

/**
 * 複数ユーザーの印鑑キャッシュ
 */
const sealCache = new Map<string, string>();

/**
 * キャッシュ付きで印鑑を生成
 */
export function generateSealImageCached(
  fullName: string,
  options: SealOptions = {}
): string {
  const surname = extractSurname(fullName);
  const cacheKey = `${surname}-${JSON.stringify(options)}`;

  if (sealCache.has(cacheKey)) {
    return sealCache.get(cacheKey)!;
  }

  const sealImage = generateSealImage(surname, options);
  sealCache.set(cacheKey, sealImage);
  return sealImage;
}
