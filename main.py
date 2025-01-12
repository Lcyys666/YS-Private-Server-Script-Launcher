import tkinter as tk
from tkinter import messagebox, filedialog
import subprocess
import os
import json
import locale  # 导入 locale 模块

# 获取系统默认编码
default_encoding = locale.getpreferredencoding()

# 定义.bat文件路径
CHINESE_BAT_PATH = "chinese.exe"
ENGLISH_BAT_PATH = "english.exe"

# 定义设置文件路径
SETTINGS_DIR = "app"
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "setting.json")

# 创建主窗口
root = tk.Tk()
root.title("YS-Private-Server-Script-Launcher")

# 设置窗口大小和位置，调整为更大的尺寸
root.geometry("600x600+500+300")

# 设置窗口图标（确保图标文件路径正确）
root.iconbitmap("app.ico")

# 定义文件路径变量
grasscutter_core_path = tk.StringVar()
mongod_path = tk.StringVar()
java_path = tk.StringVar()
directives_proxy_tools_path = tk.StringVar()

# 定义动态文本变量
label_language_text = tk.StringVar()
label_file_path_text = tk.StringVar()
label1_text = tk.StringVar()
label2_text = tk.StringVar()
label3_text = tk.StringVar()
label4_text = tk.StringVar()
browse_button_text = tk.StringVar()
start_button_text = tk.StringVar()

def load_settings():
    if not os.path.exists(SETTINGS_DIR):
        os.makedirs(SETTINGS_DIR)
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding=default_encoding) as file:  # 使用系统默认编码读取
                settings = json.load(file)
                grasscutter_core_path.set(settings.get("grasscutter_core_path", ""))
                mongod_path.set(settings.get("mongod_path", ""))
                java_path.set(settings.get("java_path", ""))
                directives_proxy_tools_path.set(settings.get("directives_proxy_tools_path", ""))
        except json.JSONDecodeError:
            messagebox.showerror("错误", "设置文件格式错误，请检查文件内容。")
        except UnicodeDecodeError:
            messagebox.showerror("错误", f"设置文件编码错误，请确保文件是{default_encoding}编码。")

def save_settings():
    settings = {
        "grasscutter_core_path": grasscutter_core_path.get(),
        "mongod_path": mongod_path.get(),
        "java_path": java_path.get(),
        "directives_proxy_tools_path": directives_proxy_tools_path.get()
    }
    with open(SETTINGS_FILE, "w", encoding=default_encoding) as file:  # 使用系统默认编码写入
        json.dump(settings, file, indent=4, ensure_ascii=False)

def select_folder(path_var):
    folder_path = filedialog.askdirectory()
    if folder_path:
        path_var.set(folder_path)
        save_settings()

def select_file(path_var, file_types):
    file_path = filedialog.askopenfilename(filetypes=file_types)
    if file_path:
        path_var.set(file_path)
        save_settings()

def update_texts():
    if language.get() == "中文":
        label_language_text.set("选择语言：")
        label_file_path_text.set("选择文件路径：")
        label1_text.set("1. 割草机核心 (文件夹)")
        label2_text.set("2. 数据库 (文件夹)")
        label3_text.set("3. Java (exe)")
        label4_text.set("4. 指令和代理工具 (exe)")
        browse_button_text.set("浏览")
        start_button_text.set("一键启动")
    elif language.get() == "English":
        label_language_text.set("Select Language:")
        label_file_path_text.set("Select File Paths:")
        label1_text.set("1. Grasscutter core (folder)")
        label2_text.set("2. Database (folder)")
        label3_text.set("3. Java (exe)")
        label4_text.set("4. Directives and proxy tools (exe)")
        browse_button_text.set("Browse")
        start_button_text.set("Start")

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

def on_closing():
    if messagebox.askokcancel("退出", "确定要退出吗？"):
        root.destroy()

# 语言选择
language = tk.StringVar(value="中文")  # 默认选择中文
tk.Label(root, textvariable=label_language_text).pack(pady=5)
tk.Radiobutton(root, text="中文", variable=language, value="中文", command=update_texts).pack(anchor="w")
tk.Radiobutton(root, text="English", variable=language, value="English", command=update_texts).pack(anchor="w")

# 文件路径选择
tk.Label(root, textvariable=label_file_path_text).pack(pady=5)

# 1. 割草机核心 / Grasscutter core
tk.Label(root, textvariable=label1_text).pack(anchor="w")
tk.Entry(root, textvariable=grasscutter_core_path, width=50).pack()
tk.Button(root, textvariable=browse_button_text, command=lambda: select_folder(grasscutter_core_path)).pack(pady=5)

# 2. 数据库 / mongod
tk.Label(root, textvariable=label2_text).pack(anchor="w")
tk.Entry(root, textvariable=mongod_path, width=50).pack()
tk.Button(root, textvariable=browse_button_text, command=lambda: select_folder(mongod_path)).pack(pady=5)

# 3. Java
tk.Label(root, textvariable=label3_text).pack(anchor="w")
tk.Entry(root, textvariable=java_path, width=50).pack()
tk.Button(root, textvariable=browse_button_text, command=lambda: select_file(java_path, [("EXE files", "*.exe")])).pack(pady=5)

# 4. 指令和代理工具 / Directives and proxy tools
tk.Label(root, textvariable=label4_text).pack(anchor="w")
tk.Entry(root, textvariable=directives_proxy_tools_path, width=50).pack()
tk.Button(root, textvariable=browse_button_text, command=lambda: select_file(directives_proxy_tools_path, [("EXE files", "*.exe")])).pack(pady=5)

# 启动按钮
start_button = tk.Button(root, textvariable=start_button_text, command=run_bat)
start_button.pack(pady=20)

# 初始化文本
update_texts()

# 加载设置
load_settings()

root.protocol("WM_DELETE_WINDOW", on_closing)
root.mainloop()