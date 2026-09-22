// 毎月16日 深夜0:00（JST）に Vercel Cron から自動起動される。
// 直前に締まった期間（前月16日〜当月15日）の「出勤簿（全員）」「命令簿（全員）」を
// 無人でPDF化し、Gmail（アプリパスワード）から指定アドレスへ自動送信する。
//
// 必要な環境変数（Vercelプロジェクト設定 → Environment Variables で追加）:
//   CRON_SECRET        Vercel Cron が自動付与する Bearer トークンと照合する秘密文字列（任意の文字列でよい）
//   GMAIL_USER          送信元Gmailアドレス
//   GMAIL_APP_PASSWORD  Googleアカウントで発行した「アプリパスワード」（16文字）
//   REPORT_TO           送信先メールアドレス（未設定時は ce-y.om@tsu-jin.jp を既定値として使用）

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import nodemailer from 'nodemailer';

export const config = {
  maxDuration: 60,
};

function jstNow() {
  // サーバーはUTCで動くため、JSTの壁時計時刻を表すDateを作る
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

// 直前に締まった期間（前月16日〜当月15日）を代表する日付（YYYY-MM-DD）を求める
function getPreviousPeriodAsOf() {
  const d = jstNow();
  d.setUTCDate(d.getUTCDate() - 1); // 16日 0:00起動 → 前日=15日に寄せて「締まった期間」を確実に指す
  return d.toISOString().slice(0, 10);
}

function getPeriodLabel(asOf) {
  const d = new Date(asOf);
  // asOf は常に締め日(15日)側なので、そのままの年月がラベルになる
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月度`;
}

async function renderPdf(browser, baseUrl, exportTarget, asOf, landscape) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  const url = `${baseUrl}/?export=${exportTarget}&asOf=${asOf}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.waitForSelector('body[data-export-ready="true"]', { timeout: 30000 });
  await page.emulateMediaType('print');

  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    landscape,
  });

  await page.close();
  return pdf;
}

export default async function handler(req, res) {
  // Vercel Cron からの起動であることを確認（外部から誰でも叩けないようにする）
  const authHeader = req.headers.authorization || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // VERCEL_URL はデプロイごとに変わる内部URLで Deployment Protection の対象になるため、
  // 保護のかからない本番の固定ドメインを使う（APP_BASE_URL で上書き可能）
  const baseUrl = process.env.APP_BASE_URL || 'https://clinic-attendance-bay.vercel.app';

  const asOf = getPreviousPeriodAsOf();
  const periodLabel = getPeriodLabel(asOf);

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const [attendancePdf, orderPdf] = await Promise.all([
      renderPdf(browser, baseUrl, 'ALL_ATTENDANCE', asOf, false),
      renderPdf(browser, baseUrl, 'ALL_OVERTIME_ORDER', asOf, true),
    ]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const toAddress = process.env.REPORT_TO || 'ce-y.om@tsu-jin.jp';

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: toAddress,
      subject: `【Smart Attendance】${periodLabel} 出勤簿・命令簿（全員）`,
      text: `${periodLabel}の出勤簿・命令簿（全員分）を添付いたします。\n\n※本メールはシステムから自動送信されています。`,
      attachments: [
        { filename: `${periodLabel}_出勤簿_全員.pdf`, content: attendancePdf },
        { filename: `${periodLabel}_命令簿_全員.pdf`, content: orderPdf },
      ],
    });

    res.status(200).json({ ok: true, period: periodLabel, to: toAddress });
  } catch (e) {
    console.error('❌ monthly-report failed:', e);
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    if (browser) await browser.close();
  }
}
