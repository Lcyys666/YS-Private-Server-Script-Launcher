import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QPushButton, QFileDialog, QMessageBox, QVBoxLayout, QHBoxLayout, QWidget, QFrame, QLabel, QRadioButton, QButtonGroup, QLineEdit, QGridLayout, QSpacerItem, QSizePolicy, QToolButton
from PyQt5.QtCore import Qt, QSettings
from PyQt5.QtGui import QFont, QColor, QIcon, QPalette
import subprocess
import os
import json
import locale

# 获取系统默认编码
default_encoding = locale.getpreferredencoding()

# 定义.bat文件路径
CHINESE_BAT_PATH = "chinese.exe"
ENGLISH_BAT_PATH = "english.exe"

# 定义设置文件路径
SETTINGS_DIR = "app"
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "setting.json")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("YS-Private-Server-Script-Launcher")
        self.setGeometry(500, 300, 600, 600)
        self.setWindowIcon(QIcon("app.ico"))

        self.dark_mode = self.is_system_dark_mode()  # 根据系统主题初始化
        self.initUI()
        self.update_styles()

    def initUI(self):
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout()
        self.central_widget.setLayout(self.layout)

        # 语言选择卡片
        self.language_card = QFrame()
        self.language_card.setFrameShape(QFrame.StyledPanel)
        self.language_card.setFrameShadow(QFrame.Raised)
        self.layout.addWidget(self.language_card)
        self.language_layout = QVBoxLayout()
        self.language_card.setLayout(self.language_layout)

        self.language_label = QLabel("选择语言：")
        self.language_label.setFont(QFont("Arial", 12))
        self.language_layout.addWidget(self.language_label)

        self.chinese_radio = QRadioButton("中文")
        self.english_radio = QRadioButton("English")
        self.chinese_radio.setChecked(True)
        self.language_layout.addWidget(self.chinese_radio)
        self.language_layout.addWidget(self.english_radio)

        self.language_group = QButtonGroup(self)
        self.language_group.addButton(self.chinese_radio)
        self.language_group.addButton(self.english_radio)
        self.language_group.buttonClicked.connect(self.update_texts)

        # 文件路径选择卡片
        self.file_path_card = QFrame()
        self.file_path_card.setFrameShape(QFrame.StyledPanel)
        self.file_path_card.setFrameShadow(QFrame.Raised)
        self.layout.addWidget(self.file_path_card)
        self.file_path_layout = QGridLayout()
        self.file_path_card.setLayout(self.file_path_layout)

        self.labels = [
            QLabel("1. 割草机核心 (文件夹)"),
            QLabel("2. 数据库 (文件夹)"),
            QLabel("3. Java (exe)"),
            QLabel("4. 指令和代理工具 (exe)")
        ]
        self.entries = [QLineEdit() for _ in range(4)]
        self.buttons = [
            QPushButton("选择文件夹", icon=QIcon("folder_icon.png")),
            QPushButton("选择文件夹", icon=QIcon("folder_icon.png")),
            QPushButton("选择文件", icon=QIcon("file_icon.png")),
            QPushButton("选择文件", icon=QIcon("file_icon.png"))
        ]

        for i, (label, entry, button) in enumerate(zip(self.labels, self.entries, self.buttons)):
            self.file_path_layout.addWidget(label, i, 0)
            self.file_path_layout.addWidget(entry, i, 1)
            self.file_path_layout.addWidget(button, i, 2)
            button.clicked.connect(lambda checked, entry=entry, i=i: self.select_path(entry, i))
            button.setToolTip("点击选择路径")

        # 启动按钮卡片
        self.start_card = QFrame()
        self.start_card.setFrameShape(QFrame.StyledPanel)
        self.start_card.setFrameShadow(QFrame.Raised)
        self.layout.addWidget(self.start_card)
        self.start_layout = QVBoxLayout()
        self.start_card.setLayout(self.start_layout)

        self.start_button = QPushButton("一键启动", icon=QIcon("start_icon.png"))
        self.start_button.clicked.connect(self.run_bat)
        self.start_button.setToolTip("点击启动服务器")
        self.start_layout.addWidget(self.start_button)

        # 深色模式切换按钮
        self.dark_mode_toggle = QToolButton()
        self.dark_mode_toggle.setText("切换到浅色模式" if self.dark_mode else "切换到深色模式")
        self.dark_mode_toggle.setCheckable(True)
        self.dark_mode_toggle.setChecked(self.dark_mode)
        self.dark_mode_toggle.clicked.connect(self.toggle_dark_mode)
        self.layout.addWidget(self.dark_mode_toggle)

        # 添加间距
        self.layout.addSpacerItem(QSpacerItem(20, 40, QSizePolicy.Minimum, QSizePolicy.Expanding))

        self.load_settings()
        self.update_texts()

    def update_styles(self):
        if self.dark_mode:
            self.setStyleSheet("""
            QMainWindow {
                background-color: #333;
            }
            QFrame {
                background-color: #444;
                border-radius: 10px;
                margin: 5px;
                padding: 10px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            QPushButton {
                background-color: #6d7fcc;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #5a67d4;
            }
            QPushButton:pressed {
                background-color: #4f5d95;
            }
            QLabel {
                font-size: 14px;
                color: #ccc;
            }
            QLineEdit {
                border: 1px solid #555;
                border-radius: 5px;
                padding: 5px;
                background-color: #333;
                color: white;
            }
            QRadioButton {
                font-size: 14px;
                color: #ccc;
            }
            QToolButton {
                background-color: #6d7fcc;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 14px;
            }
            QToolButton:hover {
                background-color: #5a67d4;
            }
            QToolButton:pressed {
                background-color: #4f5d95;
            }
            QToolButton:checked {
                background-color: #4f5d95;
            }
            """)
        else:
            self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
            }
            QFrame {
                background-color: white;
                border-radius: 10px;
                margin: 5px;
                padding: 10px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            QPushButton {
                background-color: #ff4500;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #e03100;
            }
            QPushButton:pressed {
                background-color: #c02b00;
            }
            QLabel {
                font-size: 14px;
                color: #333;
            }
            QLineEdit {
                border: 1px solid #ccc;
                border-radius: 5px;
                padding: 5px;
            }
            QRadioButton {
                font-size: 14px;
            }
            QToolButton {
                background-color: #ff4500;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 14px;
            }
            QToolButton:hover {
                background-color: #e03100;
            }
            QToolButton:pressed {
                background-color: #c02b00;
            }
            QToolButton:checked {
                background-color: #c02b00;
            }
            """)

    def is_system_dark_mode(self):
        palette = QApplication.palette()
        return palette.window().color().lightness() < 128

    def toggle_dark_mode(self):
        self.dark_mode = not self.dark_mode
        self.update_styles()
        self.dark_mode_toggle.setText("切换到浅色模式" if self.dark_mode else "切换到深色模式")

    def select_path(self, entry, index):
        if index < 2:
            folder_path = QFileDialog.getExistingDirectory(self, "选择文件夹")
            if folder_path:
                entry.setText(folder_path)
                self.save_settings()
        else:
            file_path, _ = QFileDialog.getOpenFileName(self, "选择文件", "", "EXE files (*.exe)")
            if file_path:
                entry.setText(file_path)
                self.save_settings()

    def update_texts(self):
        if self.chinese_radio.isChecked():
            texts = [
                "1. 割草机核心 (文件夹)",
                "2. 数据库 (文件夹)",
                "3. Java (exe)",
                "4. 指令和代理工具 (exe)",
                "一键启动"
            ]
        else:
            texts = [
                "1. Grasscutter core (folder)",
                "2. Database (folder)",
                "3. Java (exe)",
                "4. Directives and proxy tools (exe)",
                "Start"
            ]
        for label, text in zip(self.labels, texts[:-1]):
            label.setText(text)
        self.start_button.setText(texts[-1])

    def run_bat(self):
        try:
            if self.chinese_radio.isChecked():
                subprocess.run(["start", "cmd", "/c", CHINESE_BAT_PATH], shell=True, capture_output=True)
            else:
                subprocess.run(["start", "cmd", "/c", ENGLISH_BAT_PATH], shell=True, capture_output=True)
        except Exception as e:
            QMessageBox.critical(self, "错误", f"运行bat文件时出错：{e}")

    def load_settings(self):
        if not os.path.exists(SETTINGS_DIR):
            os.makedirs(SETTINGS_DIR)
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding=default_encoding) as file:
                    settings = json.load(file)
                    for entry, key in zip(self.entries, settings.keys()):
                        entry.setText(settings[key])
            except json.JSONDecodeError:
                QMessageBox.critical(self, "错误", "设置文件格式错误，请检查文件内容。")
            except UnicodeDecodeError:
                QMessageBox.critical(self, "错误", f"设置文件编码错误，请确保文件是{default_encoding}编码。")

    def save_settings(self):
        settings = {f"path_{i+1}": entry.text() for i, entry in enumerate(self.entries)}
        with open(SETTINGS_FILE, "w", encoding=default_encoding) as file:
            json.dump(settings, file, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())