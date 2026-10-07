' Duplo-clique NO EXPLORADOR (nao no Cursor)
Option Explicit
Dim sh, pasta, cmd
Set sh = CreateObject("WScript.Shell")
pasta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd.exe /k cd /d """ & pasta & "\.."" && git push origin main && echo. && echo SE DEU OK ACIMA, abra codemagic.io/apps && pause"
sh.Run cmd, 1, False
