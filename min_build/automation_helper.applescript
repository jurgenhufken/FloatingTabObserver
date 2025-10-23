-- Floating Tab Observer minimal build launcher
-- Run this via `osascript automation_helper.applescript` or compile in Script Editor / Automator.
-- Adjust `PROJECT_ROOT` if you move the folder.

set PROJECT_ROOT to POSIX path of (do shell script "cd \"`dirname \"$(/usr/bin/dirname \"$(/bin/pwd)\")\"\" && /bin/pwd")
if PROJECT_ROOT does not end with "FTO_MIN_no_ws_v1" then
  set PROJECT_ROOT to POSIX path of ((do shell script "pwd") & "/FTO_MIN_no_ws_v1")
end if

set STARTER to PROJECT_ROOT & "/start.command"

tell application "System Events"
  -- Ensure Terminal is granted Automation when this script runs
  set frontmost of process "Terminal" to true
end tell

do shell script "/bin/chmod +x " & quoted form of STARTER

do shell script quoted form of ("cd " & PROJECT_ROOT & " && ./start.command")
