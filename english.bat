::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFBcFFFbXAE+1EbsQ5+n//Na+kQAtRuspeZvel4eLMvYW+AjXdoQkxm4XtMoZAhhQewDmYw49p1JDpnTLPsST0w==
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSjk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFBcFFFbXAE+1EbsQ5+n//Na+kQAtRuspeZvel4eLMvYW+AjXdoQkxm4XtMoZAhhQewDmYw49p1JnuGOJPtSU/Qr5Tyg=
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
cls
echo " __   ___   _   _    _   _ ____  _   _ _____ _   _ ";
echo " \ \ / / | | | / \  | \ | / ___|| | | | ____| \ | |";
echo "  \ V /| | | |/ _ \ |  \| \___ \| |_| |  _| |  \| |";
echo "   | | | |_| / ___ \| |\  |___) |  _  | |___| |\  |";
echo "   |_|  \___/_/   \_\_| \_|____/|_| |_|_____|_| \_|";
echo "                                                   ";            
echo "  _                __    __    __   ";
echo " | |    ___ _   _ / /_  / /_  / /_  ";
echo " | |   / __| | | | '_ \| '_ \| '_ \ ";
echo " | |__| (__| |_| | (_) | (_) | (_) |";
echo " |_____\___|\__, |\___/ \___/ \___/ ";
echo "            |___/                   ";
echo You have chosen English.
echo.
    if not exist .\app\player.json (
        goto :gamenotfind
    )
)
if exist .\app\player.json (
    set /p game=<.\app\player.json
    goto :s
)
:gamenotfind
echo.&set /p select2=Enter the path to Genshin Impact's main program, but please note that folders with spaces should be in double quotation marks, for example  d:\program files\"genshin impact game"\genshinimpact.exe  .
mkdir app
cd app
echo %select2% > .\player.json
cd ..
:s
echo Hello, welcome to the program!
echo current date  %date%
echo current time  %time%
echo This one-click launch tool is made by Lcy666
echo Please press any key to start  
pause > nul
cls
echo " __   ___   _   _    _   _ ____  _   _ _____ _   _ ";
echo " \ \ / / | | | / \  | \ | / ___|| | | | ____| \ | |";
echo "  \ V /| | | |/ _ \ |  \| \___ \| |_| |  _| |  \| |";
echo "   | | | |_| / ___ \| |\  |___) |  _  | |___| |\  |";
echo "   |_|  \___/_/   \_\_| \_|____/|_| |_|_____|_| \_|";
echo "                                                   ";            
echo "  _                __    __    __   ";
echo " | |    ___ _   _ / /_  / /_  / /_  ";
echo " | |   / __| | | | '_ \| '_ \| '_ \ ";
echo " | |__| (__| |_| | (_) | (_) | (_) |";
echo " |_____\___|\__, |\___/ \___/ \___/ ";
echo "            |___/                   ";
echo Checking for port occupancy and trying to resolve it...
REM 设置app目录路径
set APP_DIR=app
REM 读取setting.json文件中的路径
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content %APP_DIR%\setting.json | ConvertFrom-Json).mongod_path"') do set MONGOD_PATH=%%a
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content %APP_DIR%\setting.json | ConvertFrom-Json).grasscutter_core_path"') do set GRASSCUTTER_CORE_PATH=%%a
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content %APP_DIR%\setting.json | ConvertFrom-Json).java_path"') do set JAVA_PATH=%%a
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content %APP_DIR%\setting.json | ConvertFrom-Json).directives_proxy_tools_path"') do set DIRECTIVES_PROXY_TOOLS_PATH=%%a
for /f "tokens=2,4,5" %%a in ('netstat -ano^|find /i ":27017 "') do (
    if not "%%c"=="" (
        set pid=%%c
    ) else (
        set pid=%%b
    )
)
for /f "tokens=1" %%a in ('tasklist /fi "pid eq %pid%"') do set prog=%%a
taskkill /f /fi "pid eq %pid%"
for /f "tokens=2,4,5" %%a in ('netstat -ano^|find /i ":21000 "') do (
    if not "%%c"=="" (
        set pid=%%c
    ) else (
        set pid=%%b
    )
)
for /f "tokens=1" %%a in ('tasklist /fi "pid eq %pid%"') do set prog=%%a
taskkill /f /fi "pid eq %pid%"
for /f "tokens=2,4,5" %%a in ('netstat -ano^|find /i ":443 "') do (
    if not "%%c"=="" (
        set pid=%%c
    ) else (
        set pid=%%b
    )
)
for /f "tokens=1" %%a in ('tasklist /fi "pid eq %pid%"') do set prog=%%a
taskkill /f /fi "pid eq %pid%"
echo Attempt to resolve complete.
echo ------------------------------
echo Database starting...
cd "%MONGOD_PATH%"
start /min mongod.exe --dbpath data --port 27017
cd ..
echo An attempt was made to start the database.
echo ------------------------------
echo Launching directives and proxy tools...
start "" "%DIRECTIVES_PROXY_TOOLS_PATH%"
echo An attempt was made to launch the directive and proxy tools.
echo ------------------------------
echo The server is being started...
timeout 3 >nul
cd %grasscutter_core_path%
start /high "" "%JAVA_PATH%" -jar Grasscutter.jar
echo An attempt was made to start the server  
echo ------------------------------
cd ..
start /high /wait %game%
color B
echo An attempt was made to launch the game  
echo ------------------------------
pause
goto menu
