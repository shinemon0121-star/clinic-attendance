#!/usr/bin/env python3
"""
RC-S380 タップ連携ブリッジ

ICカード（FeliCa、社員証など）をRC-S380にかざすと、
1) Supabase（ic_card_taps テーブル）にタップ記録を書き込み
2) 既定のブラウザで勤怠管理システムを開きます

Webアプリ側が、登録済みのカードであれば該当スタッフの
「今日を申請する」画面を自動で開き、時間外終了時刻を自動入力します。
（カードとスタッフの結びつけは、Webアプリの管理画面「ICカード」タブで行います）

── セットアップ（初回のみ）────────────────────────────────────────────
1. RC-S380 をPCにUSB接続する
2. Zadig (https://zadig.akeo.ie/) を使って、RC-S380 のドライバを
   「libusb-win32」または「WinUSB」に切り替える
   （Sony純正ドライバのままだと、このスクリプトからは読み取れません）
3. Python をインストールしていなければインストールする
4. このフォルダで次を実行する:
     pip install -r requirements.txt

── 実行 ────────────────────────────────────────────────────────────
     python tap_bridge.py

終了するには Ctrl+C を押してください。
PC起動時に自動で立ち上げたい場合は、Windowsのタスクスケジューラに
「ログオン時に実行」として登録してください。
"""

import sys
import time
import webbrowser
from datetime import datetime

import nfc
import requests

# Windows(cp932)だと絵文字で print が落ちるため、出力をUTF-8に固定する
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# ── 設定 ──────────────────────────────────────────────────────────────
SUPABASE_URL = "https://fjcvfytvwzfnmzqenijd.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_CHMeD996bMgWccBUhqft0g_kXZjNRob"
APP_URL = "https://clinic-attendance-bay.vercel.app"
COOLDOWN_SECONDS = 5  # 同じカードを連続で検知しないようにする間隔（秒）

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def record_tap(idm: str) -> bool:
    """Supabase の ic_card_taps テーブルにタップ記録を書き込む"""
    tap_id = f"tap-{int(time.time() * 1000)}"
    payload = {
        "id": tap_id,
        "idm": idm,
        "tapped_at": datetime.now().astimezone().isoformat(),
        "consumed": False,
    }
    try:
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/ic_card_taps",
            headers=HEADERS,
            json=payload,
            timeout=10,
        )
    except requests.RequestException as e:
        print(f"⚠️ 通信エラー: {e}", flush=True)
        return False

    if res.status_code >= 300:
        print(f"⚠️ Supabase書き込み失敗: {res.status_code} {res.text}", flush=True)
        return False
    return True


def main():
    print("RC-S380 タップ連携ブリッジを起動しました。", flush=True)

    try:
        clf = nfc.ContactlessFrontend("usb")
    except Exception as e:
        print(f"❌ カードリーダーに接続できませんでした: {e}", flush=True)
        print("   USB接続と、Zadigでのドライバ設定（libusb-win32）を確認してください。", flush=True)
        return

    if not clf:
        print("❌ カードリーダーが見つかりませんでした（USB接続・ドライバ設定を確認してください）。", flush=True)
        return

    print("✅ カードリーダーに接続しました。カードをかざしてください（Ctrl+Cで終了）。\n", flush=True)

    last_idm = None
    last_time = 0.0

    try:
        with clf:
            while True:
                try:
                    tag = clf.connect(rdwr={"on-connect": lambda tag: False})
                except Exception as e:
                    print(f"⚠️ 読み取りエラー: {e}", flush=True)
                    time.sleep(2)
                    continue

                if tag is None:
                    continue

                idm = tag.identifier.hex()
                now = time.time()
                if idm == last_idm and (now - last_time) < COOLDOWN_SECONDS:
                    remaining = COOLDOWN_SECONDS - (now - last_time)
                    print(f"（同じカードです。あと{remaining:.0f}秒待ってから、もう一度かざしてください）", flush=True)
                    time.sleep(1)
                    continue  # 同じカードが乗ったままの連続検知を無視

                last_idm = idm
                last_time = now

                print(f"📇 カード検知: {idm}", flush=True)
                if record_tap(idm):
                    print("✅ 記録しました。ブラウザを開きます…\n", flush=True)
                    webbrowser.open(APP_URL)
                time.sleep(1)
    except KeyboardInterrupt:
        print("終了します。", flush=True)


if __name__ == "__main__":
    main()
