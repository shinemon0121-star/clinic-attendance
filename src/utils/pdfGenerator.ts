import html2pdf from 'html2pdf.js';

export async function savePDFToDesktop(
  elementId: string,
  userName: string,
  year: number,
  month: number
): Promise<{ success: boolean; message: string }> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      return { success: false, message: 'Element not found' };
    }

    // ファイル名：2026年5月度藤原慎太郎出勤簿
    const fileName = `${year}年${month}月度${userName}出勤簿`;

    const options = {
      margin: 10,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };

    // フロントエンドで PDF を生成して Blob を取得
    const pdf = html2pdf().set(options).from(element);
    const canvas = await pdf.canvas;
    const imgData = canvas.toDataURL('image/png');

    // Electron API が利用可能な場合、ファイルシステムに直接保存
    if (window.electronAPI) {
      const result = await window.electronAPI.savePDF(
        element.innerHTML,
        fileName,
        userName,
        year,
        month
      );

      if (result.success) {
        return { success: true, message: `PDF を保存しました: ${result.path}` };
      } else {
        return { success: false, message: result.error };
      }
    } else {
      // ブラウザ環境の場合は、通常の PDF ダウンロード
      pdf.save();
      return { success: true, message: `PDF をダウンロードしました: ${fileName}.pdf` };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
