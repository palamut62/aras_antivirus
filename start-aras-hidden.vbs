Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd.exe /c """ & root & "\start-aras.bat"""
shell.CurrentDirectory = root
shell.Run cmd, 0, False
