import os
import json
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import tkinter as tk
from tkinter import messagebox, filedialog
import customtkinter as ctk
import subprocess
import sys
import time

# 定义设置文件路径
SETTINGS_DIR = "app"
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "setting.json")
VERSION_JSON_LOCAL_PATH = os.path.join(SETTINGS_DIR, "version.json")  # 本地version.json文件路径
CHINESE_BAT_PATH = "chinese.exe"
ENGLISH_BAT_PATH = "english.exe"
script_dir = os.path.dirname(os.path.abspath(__file__))
exe_path = os.path.join(script_dir, "update.exe")

# 定义语言相关的更新提示文本
update_messages = {
    "中文": {
        "update_available": "发现新版本！当前版本：{current_version}，最新版本：{latest_version}\n是否自动下载并安装更新？",
        "update_success": "更新成功，正在重启程序...",
        "update_failed": "更新失败，请手动检查更新。",
        "check_update": "检查更新",
        "error_title": "错误",
        "error_message": (
            "可能的原因包括：\n"
            "1. 网络连接问题，请检查您的网络连接。\n"
            "2. 链接可能不正确，请检查链接的合法性。\n"
            "3. 服务器可能暂时不可用，请稍后再试。\n"
            "4. 防火墙或安全软件可能阻止了访问，请检查相关设置。\n"
            "如果问题持续存在，请手动检查更新。"
        )
    },
    "English": {
        "update_available": "Update available! Current version: {current_version}, Latest version: {latest_version}\nWould you like to download and install the update?",
        "update_success": "Update successful, restarting the program...",
        "update_failed": "Update failed, please check for updates manually.",
        "check_update": "Check for Updates",
        "error_title": "Error",
        "error_message": (
            "Possible reasons include:\n"
            "1. Network connection issues, please check your network connection.\n"
            "2. The link may be incorrect, please check the link's validity.\n"
            "3. The server may be temporarily unavailable, please try again later.\n"
            "4. Firewalls or security software may be blocking access, please check the relevant settings.\n"
            "If the problem persists, please check for updates manually."
        )
    }
}

# 检查更新
def check_for_update(current_version):
    try:
        # 确保设置目录存在
        if not os.path.exists(SETTINGS_DIR):
            os.makedirs(SETTINGS_DIR)
        
        # 创建带有重试机制的会话
        session = requests.Session()
        retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
        session.mount('https://', HTTPAdapter(max_retries=retries))

        # 下载version.json到本地，忽略证书验证
        url = "https://raw.githubusercontent.com/Lcyys666/YS-Private-Server-Script-Launcher/main/version.json"
        response = session.get(url, verify=False, timeout=30)  # 忽略证书验证
        response.raise_for_status()  # 检查请求是否成功
        
        # 将内容写入本地文件，覆盖旧文件
        with open(VERSION_JSON_LOCAL_PATH, "w") as file:
            file.write(response.text)
        
        # 读取本地version.json文件
        with open(VERSION_JSON_LOCAL_PATH, "r") as file:
            latest_info = json.load(file)
        latest_version = latest_info['version']
        print(f"Current version: {current_version}, Latest version: {latest_version}")  # 调试信息
        if latest_version > current_version:
            return latest_info['url']
    except requests.exceptions.RequestException as e:
        lang = language.get()
        print(f"Current language: {lang}, Error checking for updates: {e}")  # 调试信息
        messagebox.showerror(update_messages[lang]["error_title"], update_messages[lang]["error_message"])
    except (ValueError, FileNotFoundError) as e:
        lang = language.get()
        print(f"Current language: {lang}, Error parsing JSON response or file not found: {e}")  # 调试信息
        messagebox.showerror(update_messages[lang]["error_title"], update_messages[lang]["error_message"])
    return None

# 启动更新脚本
def run_update_script(update_url):
    subprocess.Popen([exe_path], shell=True)
    root.destroy()  # 关闭主程序

# 检查更新按钮的回调函数
def on_check_update():
    current_version = "1.6.2"  # 当前版本
    update_url = check_for_update(current_version)
    if update_url:
        lang = language.get()
        msg = update_messages[lang]["update_available"].format(
            current_version=current_version,
            latest_version=update_url.split('/')[-1]
        )
        response = messagebox.askyesno("更新提示", msg)
        if response:
            run_update_script(update_url)
    else:
        lang = language.get()
        messagebox.showinfo("更新提示", update_messages[lang]["update_failed"])

# 加载设置
def load_settings():
    if not os.path.exists(SETTINGS_DIR):
        os.makedirs(SETTINGS_DIR)
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as file:
                settings = json.load(file)
                grasscutter_core_path.set(settings.get("grasscutter_core_path", ""))
                mongod_path.set(settings.get("mongod_path", ""))
                java_path.set(settings.get("java_path", ""))
                directives_proxy_tools_path.set(settings.get("directives_proxy_tools_path", ""))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            messagebox.showerror("错误", f"设置文件格式或编码错误：{e}")

# 保存设置
def save_settings():
    settings = {
        "grasscutter_core_path": grasscutter_core_path.get(),
        "mongod_path": mongod_path.get(),
        "java_path": java_path.get(),
        "directives_proxy_tools_path": directives_proxy_tools_path.get()
    }
    with open(SETTINGS_FILE, "w", encoding="utf-8") as file:
        json.dump(settings, file, indent=4, ensure_ascii=False)

# 选择文件夹
def select_folder(path_var):
    folder_path = filedialog.askdirectory()
    if folder_path:
        path_var.set(folder_path)
        save_settings()

# 选择文件
def select_file(path_var, file_types):
    file_path = filedialog.askopenfilename(filetypes=file_types)
    if file_path:
        path_var.set(file_path)
        save_settings()

# 更新文本
def update_texts():
    lang = language.get()
    print(f"Updating texts for language: {lang}")  # 调试信息
    if lang == "中文":
        label_language_text.set("选择语言：")
        label_file_path_text.set("选择文件路径：")
        label1_text.set("1. 割草机核心 (文件夹)")
        label2_text.set("2. 数据库 (文件夹)")
        label3_text.set("3. Java (exe)")
        label4_text.set("4. 指令和代理工具 (exe)")
        browse_button_text.set("浏览")
        start_button_text.set("一键启动")
        check_update_button_text.set("检查更新")
    elif lang == "English":
        label_language_text.set("Select Language:")
        label_file_path_text.set("Select File Paths:")
        label1_text.set("1. Grasscutter core (folder)")
        label2_text.set("2. Database (folder)")
        label3_text.set("3. Java (exe)")
        label4_text.set("4. Directives and proxy tools (exe)")
        browse_button_text.set("Browse")
        start_button_text.set("Start")
        check_update_button_text.set("Check for Updates")

# 运行.exe文件
def run_bat():
    try:
        if language.get() == "中文":
            subprocess.run(["start", "cmd", "/c", CHINESE_BAT_PATH], shell=True, capture_output=True)
        elif language.get() == "English":
            subprocess.run(["start", "cmd", "/c", ENGLISH_BAT_PATH], shell=True, capture_output=True)
        else:
            messagebox.showerror("错误", "请选择一种语言")
    except Exception as e:
        messagebox.showerror("错误", f"运行bat文件时出错：{e}")

# 窗口关闭事件
def on_closing():
    if messagebox.askokcancel("退出", "确定要退出吗？"):
        root.destroy()

# 主程序入口
def main():
    # 初始化窗口
    global root
    root = ctk.CTk()
    root.title("YS-Private-Server-Script-Launcher")
    root.geometry("600x600+500+300")
    root.iconbitmap("app.ico")

    # 定义文件路径变量
    global grasscutter_core_path, mongod_path, java_path, directives_proxy_tools_path
    grasscutter_core_path = tk.StringVar()
    mongod_path = tk.StringVar()
    java_path = tk.StringVar()
    directives_proxy_tools_path = tk.StringVar()

    # 定义动态文本变量
    global label_language_text, label_file_path_text, label1_text, label2_text, label3_text, label4_text, browse_button_text, start_button_text, check_update_button_text
    label_language_text = tk.StringVar()
    label_file_path_text = tk.StringVar()
    label1_text = tk.StringVar()
    label2_text = tk.StringVar()
    label3_text = tk.StringVar()
    label4_text = tk.StringVar()
    browse_button_text = tk.StringVar()
    start_button_text = tk.StringVar()
    check_update_button_text = tk.StringVar()

    # 语言选择
    global language
    language = tk.StringVar(value="中文")

    # 初始化文本
    update_texts()

    # 加载设置
    load_settings()

    # 创建语言选择部分
    ctk.CTkLabel(root, textvariable=label_language_text).pack(pady=5)
    ctk.CTkRadioButton(root, text="中文", variable=language, value="中文", command=update_texts, fg_color="#8B1A1A").pack(anchor="w")
    ctk.CTkRadioButton(root, text="English", variable=language, value="English", command=update_texts, fg_color="#8B1A1A").pack(anchor="w")

    # 创建文件路径选择部分
    ctk.CTkLabel(root, textvariable=label_file_path_text).pack(pady=5)

    # 1. 割草机核心 / Grasscutter core
    ctk.CTkLabel(root, textvariable=label1_text).pack(anchor="w")
    frame1 = ctk.CTkFrame(root)
    frame1.pack(anchor="w", padx=10)
    ctk.CTkEntry(frame1, textvariable=grasscutter_core_path, width=400).pack(side="left")
    ctk.CTkButton(frame1, textvariable=browse_button_text, command=lambda: select_folder(grasscutter_core_path), fg_color="#8B1A1A").pack(side="left", padx=10)

    # 2. 数据库 / mongod
    ctk.CTkLabel(root, textvariable=label2_text).pack(anchor="w")
    frame2 = ctk.CTkFrame(root)
    frame2.pack(anchor="w", padx=10)
    ctk.CTkEntry(frame2, textvariable=mongod_path, width=400).pack(side="left")
    ctk.CTkButton(frame2, textvariable=browse_button_text, command=lambda: select_folder(mongod_path), fg_color="#8B1A1A").pack(side="left", padx=10)

    # 3. Java
    ctk.CTkLabel(root, textvariable=label3_text).pack(anchor="w")
    frame3 = ctk.CTkFrame(root)
    frame3.pack(anchor="w", padx=10)
    ctk.CTkEntry(frame3, textvariable=java_path, width=400).pack(side="left")
    ctk.CTkButton(frame3, textvariable=browse_button_text, command=lambda: select_file(java_path, [("EXE files", "*.exe")]), fg_color="#8B1A1A").pack(side="left", padx=10)

    # 4. 指令和代理工具 / Directives and proxy tools
    ctk.CTkLabel(root, textvariable=label4_text).pack(anchor="w")
    frame4 = ctk.CTkFrame(root)
    frame4.pack(anchor="w", padx=10)
    ctk.CTkEntry(frame4, textvariable=directives_proxy_tools_path, width=400).pack(side="left")
    ctk.CTkButton(frame4, textvariable=browse_button_text, command=lambda: select_file(directives_proxy_tools_path, [("EXE files", "*.exe")]), fg_color="#8B1A1A").pack(side="left", padx=10)

    # 启动按钮
    start_button = ctk.CTkButton(root, textvariable=start_button_text, command=run_bat, fg_color="#8B1A1A")
    start_button.pack(pady=20)

    # 检查更新按钮
    check_update_button = ctk.CTkButton(root, textvariable=check_update_button_text, command=on_check_update, fg_color="#8B1A1A")
    check_update_button.pack(pady=10)

    # 窗口关闭事件
    root.protocol("WM_DELETE_WINDOW", on_closing)

    root.mainloop()

if __name__ == "__main__":
    main()