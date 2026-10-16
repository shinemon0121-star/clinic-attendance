' RC-S380 タップ連携ブリッジを、画面に何も表示せず裏で起動する
' このファイル自身を右クリック →「ショートカットの作成」→ できたショートカットを
' スタートアップフォルダ（Win+R → shell:startup）に入れておくと、PCログオン時に自動起動する
Set objFSO = CreateObject("Scripting.FileSystemObject")
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

Set objShell = CreateObject("WScript.Shell")
objShell.Run """" & scriptDir & "\run.bat""", 0, False
