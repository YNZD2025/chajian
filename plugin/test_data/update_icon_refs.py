import os
import re

# 要处理的文件列表
html_files = [
    'popup/fill.html',
    'popup/settings.html',
    'popup/test-status.html',
    'popup/profile.html',
    'popup/history.html',
    'popup/feedback.html',
    'popup/about.html',
    'popup/help.html',
    'popup/privacy-settings.html',
    'popup/change-password.html',
    'popup/edit-resume.html',
    'popup/login.html'
]

base_dir = r'D:\1.code\1.code\1.ProjectManagement\dev-projects\new\code\chajian\plugin\chrome'

for file_path in html_files:
    full_path = os.path.join(base_dir, file_path)

    if not os.path.exists(full_path):
        print(f'文件不存在: {full_path}')
        continue

    # 读取文件
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 替换 Font Awesome CSS 引用为 simple-icons.css
    original_content = content
    content = re.sub(
        r'<link\s+rel="stylesheet"\s+href="styles/font-awesome\.all\.min\.css"\s*/?>',
        '<link rel="stylesheet" href="styles/simple-icons.css">',
        content
    )

    # 如果内容有变化，写回文件
    if content != original_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[OK] Updated: {file_path}')
    else:
        print(f'[SKIP] No change: {file_path}')

print('\nAll files processed!')
