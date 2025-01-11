::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFBcFFFbXAE+/Fb4I5/jHaRZqJ6fc0ynwRI7LyoiIIfYa6UrqO58u2Ro=
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
::cRYluBh/LU+EWAjk
::YxY4rhs+aU+IeA==
::cxY6rQJ7JhzQF1fEqQJhZkkaHErSXA==
::ZQ05rAF9IBncCkqN+0xwdVsFAlbMbCXqZg==
::ZQ05rAF9IAHYFVzEqQIJG1ZkXg2UPX+/S4YZ+v7+/ae0oV8URPZyVI7O1LeGJfJz
::eg0/rx1wNQPfEVWB+kM9LVsJDAiBJSudFLQP++vu+/6CsF59
::fBEirQZwNQPfEVWB+kM9LVsJDD2xcVuoD6Md/O223O+VtEgPGdE8aobLzvmiIfUd6U3hZ/Y=
::cRolqwZ3JBvQF1fEqQIJPRpafwyHMiuKFLwK6fz+r9mCsFsYRqIMe53SyqDODOEG5EbscIRN
::dhA7uBVwLU+EWHWH7RRmfns=
::YQ03rBFzNR3SWATE2EEpfk0CLA==
::dhAmsQZ3MwfNWATE2EEpfk0CLA==
::ZQ0/vhVqMQ3MEVWAtB9wBBhNGlLUXA==
::Zg8zqx1/OA3MEVWAtB9wBBhNGlLUXA==
::dhA7pRFwIByZRRm94UM+GxNRQkSyLmKsB6EZqNv+/fyCsA0uV/A2aJub9rWbLuMb71eE
::Zh4grVQjdCyDJGyX8VAjFBcFFFbXAE+1EbsQ5+n//Na+kQAtRuspeZvel4eLMvYW+AjpdJ8j6lZbjcUPBB5KMBeza28=
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
cls

:menu
echo.
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ███               
echo                                                                                  ████               
echo                                                                                  ████               
echo            █                                             █                       █████              
echo           ██                                             ██                     ██████              
echo          ████                                           ███                    ████████             
echo        ████████                                       ████████               ████████████           
echo     █████████████████████████████████████████████████████████████         ██████████████████        
echo        █████████             ████                     ███████                  ████████             
echo         ███████            ███████                      ███   ██                 ████               
echo         ███████  ███████     ████     ███████            █████████  ███████      ███      ████████  
echo         ███████  █████████████████████████████  ███████████████████ ████████████████████████████████
echo         ███████  ███████              ███████   ██████ █████████████████████     ████     ████████  
echo         ███████  ███████              ███████   ██████ ██████       ████████    ███████   ████████  
echo         ███████  ████████████████████ ███████   ██████ ██████ ████  ██████████████████████████████  
echo         ███████  ███████              ███████   ██████ ████████████ ██████████████████████████████  
echo         ███████  ███████              ███████   ██████ ██████ █████ ████████   ████████   ████████  
echo        ████████  ████████████████████████████   ██████ ██████ █████ ████████     █████    ████████  
echo        ███████   ██████     ███████   ███████   ██████ ██████ █████ ██████████████████████████████  
echo        ███████   ██         ███████             ██████ ██████ ████  ██████████████████████████████  
echo        ██████      █████    ███████   ██████    █████  ██████ ███   ███████      ████      ███████  
echo       ██████  █████████████ ███████ █████████████████  ██████       ████        ██████        ████  
echo      █████  ██████████████  ██████  ████████████████   ██████                ████████████           
echo     █████   ██████          ███████         ███████    ██████              ████████████████         
echo    ███        ████          ██████          ████       ██████                 ██████████            
echo  █                  ████    ██████     ███             █████                   ████████             
echo                             ████                       ████                     ██████              
echo                             ██                         ██                       ██████              
echo                                                                                  ████               
echo                                                                                  ████               
echo                                                                                  ████               
echo                                                                                   ███               
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                
echo                                                                                   ██                        
echo 选择语言(Please choose a language):
echo 1 - English
echo 2 - 中文
echo 3 - 退出(Exit)
echo.
choice /C:123 /M "选择(Enter your choice): "

if errorlevel 3 goto exit
if errorlevel 2 goto chinese
if errorlevel 1 goto english

:english
echo You have chosen English.
echo.
    if not exist .\player.json (
        goto :gamenotfind
    )
)
if exist .\player.json (
    set /p game=<.\player.json
    goto :s
)
:gamenotfind
echo.&set /p select2=Enter the path to Genshin Impact's main program, but please note that folders with spaces should be in double quotation marks, for example“d:\program files\"genshin impact game"\genshinimpact.exe”.
echo %select2% > .\player.json
:s
echo Hello, welcome to the program!
echo current date：%date%
echo current time：%time%
echo This one-click launch tool is made by Lcy666
echo Please press any key to start！
echo ------------------------------
pause > nul
cls
echo Checking for port occupancy and trying to resolve it...
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
cd Database
echo Database starting...
start /min mongod.exe --dbpath data --port 27017
echo An attempt was made to start the database.
cd ..
cd Tool
echo ------------------------------
echo Launching directives and proxy tools...
start Directive and Proxy Tools.exe
echo An attempt was made to launch the directive and proxy tools.
cd ..
echo ------------------------------
cd Grasscutter
echo The server is being started...
timeout 3 >nul
start /high ..\Java\bin\java.exe -jar Grasscutter.jar
echo An attempt was made to start the server。
echo ------------------------------
cd ..
start /high /wait %game%
color B
echo An attempt was made to launch the game。
echo ------------------------------
pause
goto menu

:chinese
echo 你选了中文。
echo.
echo 你好，欢迎使用本程序！
echo 正在检测游戏主程序...
    if not exist .\player.json (
        goto :gamenotfind1
    )
)
if exist .\player.json (
    set /p game=<.\player.json
    goto :s1
)
:gamenotfind1
echo.&set /p select2=输入原神的主程序的路径，但请注意，带空格的文件夹请加上英文的双引号，比如“d:\program files\"genshin impact game"\genshinimpact.exe”。
echo %select2% > .\player.json
:s1
echo 当前日期：%date%
echo 当前时间：%time%
echo 本一键启动工具由lcy666制作
echo 请按任意键启动！
echo ------------------------------
pause > nul
cls
echo 正在检查端口占用并尝试解决...
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
echo 尝试解决完成。
echo ------------------------------
cd 数据库
echo 正在启动数据库...
start /min mongod.exe --dbpath data --port 27017
echo 已尝试启动数据库。
cd ..
cd 指令和代理工具
echo ------------------------------
echo 正在启动指令和代理工具...
start 指令和代理工具.exe
echo 已尝试启动指令和代理工具。
cd ..
echo ------------------------------
cd 割草机
echo 正在启动割草机服务端...
timeout 3 >nul
start /high ..\Java\bin\java.exe -jar 割草机核心.jar
echo 已尝试启动服务端。
echo ------------------------------
cd ..
start /high /wait %game%
color B
echo 已尝试启动游戏。
echo ------------------------------
pause
goto menu

:exit
echo 退出程序(Exiting the program).
pause
exit