import os
import requests
import zipfile
import sys
import shutil
import locale
import json
import threading
from tkinter import Tk, Label, Button, Entry, Text, END, messagebox, filedialog

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)

# 定义版本信息文件路径
VERSION_INFO_URL = "https://raw.githubusercontent.com/Lcyys666/YS-Private-Server-Script-Launcher/main/version.json"
TARGET_DIR = os.path.dirname(os.path.abspath(__file__))  # 当前脚本所在目录
VERSION_INFO_LOCAL_PATH = os.path.join(TARGET_DIR, "version.json")  # 本地版本信息文件路径

def download_version_info(url, target_path):
    try:
        response = requests.get(url, timeout=30, verify=False)  # 增加超时时间，禁用 SSL 证书验证
        response.raise_for_status()  # 检查请求是否成功
        with open(target_path, 'wb') as file:
            file.write(response.content)
        return True
    except requests.exceptions.RequestException as e:
        messagebox.showerror("下载失败", f"下载版本信息文件失败：{e}")
        return False

def get_latest_update_url():
    try:
        with open(VERSION_INFO_LOCAL_PATH, 'r', encoding='utf-8') as file:
            latest_info = json.load(file)
        return latest_info['url']
    except FileNotFoundError:
        messagebox.showerror("文件未找到", f"本地版本信息文件 {VERSION_INFO_LOCAL_PATH} 未找到，请先下载版本信息文件。")
        return None
    except json.JSONDecodeError as e:
        messagebox.showerror("解析失败", f"解析版本信息文件失败：{e}")
        return None

def download_update(url, target_path):
    try:
        response = requests.get(url, stream=True, timeout=9999, verify=False)  # 增加超时时间，禁用 SSL 证书验证
        response.raise_for_status()  # 检查请求是否成功
        with open(target_path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
        return True
    except requests.exceptions.RequestException as e:
        messagebox.showerror("下载失败", f"下载更新包失败：{e}")
        return False

def extract_update(zip_path, target_dir):
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        return True
    except Exception as e:
        messagebox.showerror("解压失败", f"解压更新包失败：{e}")
        return False

def update_program():
    status_text.delete(1.0, END)
    status_text.insert(END, "正在下载版本信息文件...\n")
    if not download_version_info(VERSION_INFO_URL, VERSION_INFO_LOCAL_PATH):
        status_text.insert(END, "下载版本信息文件失败，更新终止。\n")
        return

    status_text.insert(END, "正在获取最新更新链接...\n")
    latest_update_url = get_latest_update_url()
    if not latest_update_url:
        status_text.insert(END, "无法获取最新的更新链接，更新终止。\n")
        return

    zip_file_path = os.path.join(TARGET_DIR, "update.zip")
    status_text.insert(END, "正在下载更新包...\n")
    if download_update(latest_update_url, zip_file_path):
        status_text.insert(END, "正在解压更新包...\n")
        if extract_update(zip_file_path, TARGET_DIR):
            status_text.insert(END, "更新成功，删除更新文件并退出程序...\n")
            os.remove(zip_file_path)  # 删除下载的压缩包
            os.remove(VERSION_INFO_LOCAL_PATH)  # 删除下载的版本信息文件
            status_text.insert(END, "更新完成。\n")
        else:
            status_text.insert(END, "解压更新包失败，更新终止。\n")
    else:
        status_text.insert(END, "下载更新包失败，更新终止。\n")

def start_update_thread():
    threading.Thread(target=update_program).start()

# 创建主窗口
root = Tk()
root.title("程序更新器")
root.geometry("600x400")

# 创建界面元素
Label(root, text="程序更新器", font=("Arial", 16)).pack(pady=10)
status_text = Text(root, height=10, width=60)
status_text.pack(pady=10)
update_button = Button(root, text="开始更新", command=start_update_thread, font=("Arial", 12))
update_button.pack(pady=20)

root.mainloop()